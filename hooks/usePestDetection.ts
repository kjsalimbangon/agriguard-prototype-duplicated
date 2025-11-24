import { useState, useEffect, useCallback, MutableRefObject } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { databaseManager, PestDetection, PestSpecies } from '@/database/DatabaseManager';
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';

// Types: the cameraRef from your DetectScreen is a ref to CameraView - keep as any to avoid strict coupling
type CameraRef = MutableRefObject<any | null>;

export function usePestDetection(cameraRef?: CameraRef) {
  const [isScanning, setIsScanning] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<PestDetection[]>([]);
  const [pestDatabase, setPestDatabase] = useState<PestSpecies[]>([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    todayDetections: 0,
    mostCommonPest: 'None',
    averageConfidence: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Local model refs
  const [cocoModel, setCocoModel] = useState<any | null>(null);
  const [tfReady, setTfReady] = useState(false);

  // Scanning config
  const INFERENCE_INTERVAL_MS = 700; // tune this: 300-900ms depending on performance
  const MIN_CONFIDENCE = 0.4; // coco-ssd detection score threshold

  // Map your desired pest types to candidate COCO classes (approximate)
  // We will accept detections whose coco.class is in the arrays below, then run TM model on the crop
  const COCO_CLASS_MAP: Record<string, string[]> = {
    grasshopper: ['bird'], // approximate
    bug: ['bird'],         // approximate "small moving object"
    rat: ['mouse'],        // closest COCO match
    snail: ['mouse']       // approximate small blob
  };

  // A flattened set of allowed coco classes to check quickly
  const allowedCocoClasses = new Set<string>(
    Object.values(COCO_CLASS_MAP).flat()
  );

  // Helper: refreshers
  const loadDetectionHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const history = await pestDetectionService.getDetectionHistory();
      setDetectionHistory(history);
    } catch (error) {
      console.error('Failed to load detection history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPestDatabase = useCallback(async () => {
    try {
      const database = await pestDetectionService.getPestDatabase();
      setPestDatabase(database);
    } catch (error) {
      console.error('Failed to load pest database:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const detectionStats = await pestDetectionService.getDetectionStats();
      setStats(detectionStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([loadDetectionHistory(), loadPestDatabase(), loadStats()]);
  }, [loadDetectionHistory, loadPestDatabase, loadStats]);

  // Original public analyzeImage kept (uses your existing TM pipeline)
  const analyzeImage = useCallback(async (imageUri: string): Promise<DetectionResult> => {
    const result = await pestDetectionService.analyzeImage(imageUri);

    // refresh local DB/stats after classification
    await Promise.all([loadDetectionHistory(), loadStats()]);
    return result;
  }, [loadDetectionHistory, loadStats]);

  // handleDetection callback (preserve existing behaviour)
  const handleDetection = useCallback((result: DetectionResult) => {
    console.log('Pest detected:', result);
    // Refresh detection history & stats (keeps behaviour same as before)
    loadDetectionHistory();
    loadStats();
  }, [loadDetectionHistory, loadStats]);

  // ----- Initialization: TF & COCO -----
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await databaseManager.initialize();
        const species = await databaseManager.getPestSpecies();
        console.log('🐞 Seeded pest species:', species);

        // load your TM model into pestDetectionService (keeps same behaviour)
        await pestDetectionService['loadModel']?.();

        // Initialize tf-react-native backend & coco-ssd
        await tfRN.ready();
        // prefer rn-webgl backend if available
        try {
          await tf.setBackend('rn-webgl');
        } catch (err) {
          // fallback to default
          console.warn('rn-webgl backend unavailable, using default backend', err);
        }
        setTfReady(true);

        // load coco-ssd
        const loadedCoco = await cocoSsd.load();
        if (!mounted) return;
        setCocoModel(loadedCoco);
        console.log('✅ coco-ssd loaded');
        refreshData();
      } catch (err) {
        console.error('Initialization error in usePestDetection:', err);
      }
    };

    init();

    return () => { mounted = false; };
  }, [refreshData]);

  // ----- Continuous scanning loop (uses cameraRef) -----
  useEffect(() => {
    let intervalHandle: NodeJS.Timeout | null = null;
    let running = true;

    const runLoop = async () => {
      if (!cameraRef?.current) return;
      if (!cocoModel) return;

      try {
        // take a lower-res picture to reduce time
        // skipProcessing: true tends to be faster on native (but varies)
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
          skipProcessing: true,
        });

        if (!photo) return;

        // Use photo.width / photo.height if available; otherwise infer from decoded tensor
        const photoWidth = photo.width;
        const photoHeight = photo.height;

        // Convert base64 to Uint8Array and decode jpeg to tensor
        if (!photo.base64) {
          // If base64 not available, we fall back to using photo.uri and ImageManipulator for cropping (and skip coco detection)
          console.warn('No base64 in photo — skipping frame detection');
          return;
        }
        const raw = tfRN.base64ToUint8Array(photo.base64);
        const inputTensor = tfRN.decodeJpeg(raw); // shape [h, w, 3]

        // Run coco detect on the tensor
        const detections = await cocoModel.detect(inputTensor as any); // array of {bbox: [x,y,w,h], class, score}
        // Dispose input tensor now (we don't need it anymore)
        tf.dispose(inputTensor);

        if (!detections || !detections.length) return;

        // For each detection above threshold and whose class is in allowed set,
        // crop region from original photo and run your TM classifier (analyzeImage)
        for (const det of detections) {
          if (!det.score || det.score < MIN_CONFIDENCE) continue;
          const cocoClass: string = det.class;
          if (!allowedCocoClasses.has(cocoClass)) continue;

          // det.bbox = [x, y, width, height] in pixels relative to the tensor input
          // We'll use photo.width / photo.height if available to compute cropping coords.
          const [x, y, w, h] = det.bbox.map((v: number) => Math.max(0, Math.round(v)));

          // compute crop coordinates: if photo dimensions available, we can use directly.
          // NOTE: decodeJpeg produced tensor matching the encoded photo so coordinates align.
          const originX = x;
          const originY = y;
          const cropW = Math.max(1, w);
          const cropH = Math.max(1, h);

          // Crop the image using Expo ImageManipulator for a quick region of interest
          // We also optionally resize the crop to the TM input size inside your service (your service does its own resizing)
          try {
            const manipResult = await ImageManipulator.manipulateAsync(
              // prefer to crop from URI (preserves full resolution)
              photo.uri,
              [
                { crop: { originX, originY, width: cropW, height: cropH } },
                // you can resize here if you want; pestDetectionService.uriToTensor handles resizing to 224x224 already
                // { resize: { width: 224, height: 224 } }
              ],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            if (!manipResult?.uri) continue;

            // Run your existing TeachableMachine classifier on the cropped region
            const tmResult = await pestDetectionService.analyzeImage(manipResult.uri);

            // Only treat it as a detection if TM returned detected=true
            if (tmResult?.detected) {
              // Attach bounding box and coco info into the returned DetectionResult for UI/DB usage
              const enriched: DetectionResult = {
                ...tmResult,
                // you can add raw bbox or coco class for later use if you like
                // @ts-ignore - optional enrichment
                coco: { class: cocoClass, score: det.score, bbox: det.bbox },
              };

              // Call the existing handler (saves to DB via analyzeImage & then we also call handleDetection)
              handleDetection(enriched);
            }
          } catch (cropErr) {
            console.warn('Failed to crop & analyze detection region:', cropErr);
            continue;
          }
        }
      } catch (err) {
        console.error('Continuous scanning error:', err);
      }
    };

    if (isScanning) {
      // don't run scanning if no cameraRef or model
      if (!cameraRef?.current) {
        console.warn('Scanning requested but cameraRef is not set. Pass cameraRef to usePestDetection(cameraRef).');
      } else if (!cocoModel) {
        console.warn('Scanning requested but coco-ssd model not yet loaded.');
      }

      // start interval loop
      intervalHandle = setInterval(() => {
        if (running) runLoop();
      }, INFERENCE_INTERVAL_MS);
    }

    // Cleanup
    return () => {
      running = false;
      if (intervalHandle) {
        clearInterval(intervalHandle);
      }
    };
  }, [isScanning, cameraRef, cocoModel]); // re-create loop if scanning toggled or model/cameraRef changes

  // start/stop scanning controls
  const startScanning = useCallback(() => {
    setIsScanning(true);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  // expose same public API as before
  return {
    isScanning,
    detectionHistory,
    pestDatabase,
    stats,
    isLoading,
    startScanning,
    stopScanning,
    analyzeImage,
    refreshData
  };
}