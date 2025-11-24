import { useState, useEffect, useCallback, MutableRefObject, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ImageManipulator from 'expo-image-manipulator';
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';

type CameraRef = MutableRefObject<any | null>;

export function usePestScanner(
  cameraRef: CameraRef | undefined,
  onDetect: (result: DetectionResult) => void
) {
  const [isScanning, setIsScanning] = useState(false);
  const [cocoModel, setCocoModel] = useState<any | null>(null);
  const [tfReady, setTfReady] = useState(false);
  
  const isScanningRef = useRef(isScanning);
  const isProcessingRef = useRef(false);

  const INTERVAL_MS = 700;
  const MIN_CONFIDENCE = 0.4;
  const allowedCocoClasses = new Set(["bird", "mouse"]);

  // Keep ref in sync
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  // Init TensorFlow + COCO
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await tfRN.ready();
        await tf.setBackend("rn-webgl").catch(() => {});
        if (!mounted) return;
        setTfReady(true);

        const model = await cocoSsd.load();
        if (!mounted) return;
        setCocoModel(model);
      } catch (err) {
        console.error("Scanner init error:", err);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Memoize the scan function to prevent recreating on every render
  const performScan = useCallback(async () => {
    if (!cameraRef?.current || !cocoModel || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    let tensor: tf.Tensor3D | null = null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
      });

      if (!photo.base64 || !isScanningRef.current) return;

      const raw = tfRN.base64ToUint8Array(photo.base64);
      tensor = tfRN.decodeJpeg(raw);

      const detections = await cocoModel.detect(tensor);

      for (const det of detections) {
        if (!isScanningRef.current) break;
        if (det.score < MIN_CONFIDENCE) continue;
        if (!allowedCocoClasses.has(det.class)) continue;

        const [x, y, w, h] = det.bbox.map((n: number) => Math.round(Math.max(0, n)));

        // Validate crop dimensions
        if (w <= 0 || h <= 0) continue;

        const cropped = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ crop: { originX: x, originY: y, width: w, height: h } }],
          { compress: 0.7 }
        );

        const tmResult = await pestDetectionService.analyzeImage(cropped.uri);

        if (tmResult?.detected) {
          const enriched: DetectionResult = {
            ...tmResult,
            coco: det,
            boundingBoxes: [{
              x: det.bbox[0],
              y: det.bbox[1],
              width: det.bbox[2],
              height: det.bbox[3],
              confidence: det.score
            }]
          };

          onDetect(enriched);
        }
      }
    } catch (err) {
      console.error("Scanner loop error:", err);
    } finally {
      if (tensor) tf.dispose(tensor);
      isProcessingRef.current = false;
    }
  }, [cameraRef, cocoModel, onDetect, MIN_CONFIDENCE]);

  // Continuous scanning loop with proper async handling
  useEffect(() => {
    if (!isScanning || !cameraRef?.current || !cocoModel) return;

    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleNext = () => {
      if (isScanningRef.current) {
        timeoutId = setTimeout(async () => {
          await performScan();
          scheduleNext(); // Schedule next scan after current one completes
        }, INTERVAL_MS);
      }
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScanning, cameraRef, cocoModel, performScan]);

  return {
    isScanning,
    startScanning: useCallback(() => setIsScanning(true), []),
    stopScanning: useCallback(() => setIsScanning(false), []),
    tfReady,
    cocoModelReady: cocoModel !== null,
  };
}