import { useState, useEffect, useCallback, MutableRefObject } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ImageManipulator from 'expo-image-manipulator';
import { databaseManager, PestDetection, PestSpecies } from '@/database/DatabaseManager';
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';

type CameraRef = MutableRefObject<any | null>;

export function usePestDetection(cameraRef?: CameraRef) {
  // Shared state (from OLD)
  const [isScanning, setIsScanning] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<PestDetection[]>([]);
  const [pestDatabase, setPestDatabase] = useState<PestSpecies[]>([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    todayDetections: 0,
    mostCommonPest: 'None',
    averageConfidence: 0
  });

  // New additions
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cocoModel, setCocoModel] = useState<any | null>(null);
  const [tfReady, setTfReady] = useState(false);

  const INFERENCE_INTERVAL_MS = 700;
  const MIN_CONFIDENCE = 0.4;

  const COCO_CLASS_MAP: Record<string, string[]> = {
    grasshopper: ['bird'],
    bug: ['bird'],
    rat: ['mouse'],
    snail: ['mouse'],
  };

  const allowedCocoClasses = new Set<string>(
    Object.values(COCO_CLASS_MAP).flat()
  );

  // -----------------------------
  //  Loaders (FROM OLD HOOK)
  // -----------------------------
  const loadDetectionHistory = useCallback(async () => {
    try {
      const history = await pestDetectionService.getDetectionHistory();
      setDetectionHistory(history);
    } catch (error) {
      console.error('Failed to load detection history:', error);
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
    await Promise.all([
      loadDetectionHistory(),
      loadPestDatabase(),
      loadStats()
    ]);
  }, [loadDetectionHistory, loadPestDatabase, loadStats]);

  // -----------------------------
  //  Analyze Image (FROM OLD)
  // -----------------------------
  const analyzeImage = useCallback(async (imageUri: string): Promise<DetectionResult> => {
    const result = await pestDetectionService.analyzeImage(imageUri);
    loadDetectionHistory();
    loadStats();
    return result;
  }, [loadDetectionHistory, loadStats]);

  // -----------------------------
  //  handleDetection (PRESERVED)
  // -----------------------------
  const handleDetection = useCallback((result: DetectionResult) => {
    console.log('Pest detected:', result);
    loadDetectionHistory();
    loadStats();
  }, [loadDetectionHistory, loadStats]);

  // -----------------------------
  // Initialization: TF + COCO + DB
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await databaseManager.initialize();
        await pestDetectionService['loadModel']?.();

        await tfRN.ready();
        try {
          await tf.setBackend('cpu');
        } catch {}

        setTfReady(true);

        const loadedModel = await cocoSsd.load();
        if (!mounted) return;
        setCocoModel(loadedModel);

        await refreshData();
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    init();

    return () => { mounted = false; };
  }, [refreshData]);

  // -----------------------------
  //  Continuous Scanning Loop
  // -----------------------------
  useEffect(() => {
    let intervalHandle: NodeJS.Timeout | null = null;
    let running = true;

    const runLoop = async () => {
      if (!isScanning || !cameraRef?.current || !cocoModel) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const raw = tfRN.base64ToUint8Array(photo.base64);
        const inputTensor = tfRN.decodeJpeg(raw);

        const detections = await cocoModel.detect(inputTensor as any);
        tf.dispose(inputTensor);

        for (const det of detections) {
          if (!det.score || det.score < MIN_CONFIDENCE) continue;
          if (!allowedCocoClasses.has(det.class)) continue;

          const [x, y, w, h] = det.bbox.map((v: number) => Math.max(0, Math.round(v)));

          const cropped = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ crop: { originX: x, originY: y, width: w, height: h } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          const tmResult = await pestDetectionService.analyzeImage(cropped.uri);

          if (tmResult?.detected) {
            const enriched: DetectionResult = {
              ...tmResult,
              coco: { class: det.class, score: det.score, bbox: det.bbox },
              boundingBoxes: [
                {
                  x: det.bbox[0], y: det.bbox[1],
                  width: det.bbox[2], height: det.bbox[3],
                  label: tmResult.pestType ?? det.class,
                  confidence: det.score,
                }
              ]
            };

            handleDetection(enriched);
            setDetectionResults(enriched);
          }
        }
      } catch (err) {
        console.error('Scanning error:', err);
      }
    };

    if (isScanning) {
      intervalHandle = setInterval(() => running && runLoop(), INFERENCE_INTERVAL_MS);
    }

    return () => {
      running = false;
      if (intervalHandle) clearInterval(intervalHandle);
    };
  }, [isScanning, cameraRef, cocoModel, handleDetection]);

  // -----------------------------
  //  Start/Stop scanning
  // -----------------------------
  const startScanning = useCallback(() => {
    setIsScanning(true);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
  }, []);

  // -----------------------------
  //  Public API (EXACTLY same as old + new)
  // -----------------------------
  return {
    isScanning,
    detectionHistory,
    pestDatabase,
    stats,
    isLoading,
    startScanning,
    stopScanning,
    analyzeImage,
    refreshData,
    detectionResults,
  };
}