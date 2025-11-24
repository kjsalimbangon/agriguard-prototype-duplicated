import { useState, useEffect, useCallback, MutableRefObject } from 'react';
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

  const INTERVAL_MS = 700;
  const MIN_CONFIDENCE = 0.4;

  const allowedCocoClasses = new Set(["bird", "mouse"]);

  // Init TensorFlow + COCO
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await tfRN.ready();
        await tf.setBackend("rn-webgl").catch(() => {});
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

  // Continuous scanning loop
  useEffect(() => {
    if (!isScanning || !cameraRef?.current || !cocoModel) return;

    let running = true;
    let handle: NodeJS.Timeout | null = null;

    const loop = async () => {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.3,
          skipProcessing: true,
        });

        if (!photo.base64) return;

        const raw = tfRN.base64ToUint8Array(photo.base64);
        const tensor = tfRN.decodeJpeg(raw);

        const detections = await cocoModel.detect(tensor as any);
        tf.dispose(tensor);

        for (const det of detections) {
          if (det.score < MIN_CONFIDENCE) continue;
          if (!allowedCocoClasses.has(det.class)) continue;

          const [x, y, w, h] = det.bbox.map((n: number) => Math.round(Math.max(0, n)));

          const cropped = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ crop: { originX: x, originY: y, width: w, height: h } }],
            { compress: 0.7 }
          );

          const tmResult = await pestDetectionService.analyzeImage(cropped.uri);

          if (tmResult?.detected) {
            const enriched = {
              ...tmResult,
              coco: det,
              boundingBoxes: [{
                x: det.bbox[0], y: det.bbox[1],
                width: det.bbox[2], height: det.bbox[3],
                confidence: det.score
              }]
            };

            onDetect(enriched);
          }
        }
      } catch (err) {
        console.error("Scanner loop error:", err);
      }
    };

    handle = setInterval(() => running && loop(), INTERVAL_MS);

    return () => {
      running = false;
      if (handle) clearInterval(handle);
    };
  }, [isScanning, cameraRef, cocoModel, onDetect]);

  return {
    isScanning,
    startScanning: () => setIsScanning(true),
    stopScanning: () => setIsScanning(false),
    tfReady,
    cocoModelReady: cocoModel !== null,
  };
}
