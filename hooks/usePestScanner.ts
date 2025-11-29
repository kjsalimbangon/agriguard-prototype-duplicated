import { useState, useEffect, useCallback, MutableRefObject, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';

type CameraRef = MutableRefObject<any | null>;

export function usePestScanner(
  cameraRef: CameraRef | undefined,
  onDetect: (result: DetectionResult) => void
) {
  const [isScanning, setIsScanning] = useState(false);
  const [tfReady, setTfReady] = useState(false);

  const isScanningRef = useRef(isScanning);
  const isProcessingRef = useRef(false);

  const INTERVAL_MS = 1000;

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  /*// Init TensorFlow ONLY (no COCO)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        console.log("Initializing TensorFlow...");
        
        await tfRN.ready();
        console.log("TensorFlow ready");

        try {
          await tf.setBackend("rn-webgl");
          console.log("WebGL backend set");
        } catch {
          console.warn("WebGL unavailable, using default backend");
        }

        if (mounted) setTfReady(true);

      } catch (err) {
        console.error("TensorFlow init failed:", err);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);*/

  const performScan = useCallback(async () => {
    if (!cameraRef?.current) {
      console.warn("No camera ref");
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      console.log("Taking photo...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        base64: false,
      });

      if (!photo?.uri) {
        console.error("takePictureAsync returned no URI");
        return;
      }

      console.log("Resizing for inference...");
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 512 } }],
        { base64: true, compress: 0.8 }
      );

      if (!resized.base64) {
        console.error("Image resize failed - no base64");
        return;
      }

      console.log("Sending to Roboflow model...");
      const tmResult = await pestDetectionService.analyzeImage(resized.uri);

      if (!tmResult) {
        console.warn("No result from PestDetectionService");
        return;
      }

      // DIRECT OUTPUT FROM ROBOFLOW
      const enriched: DetectionResult = {
        ...tmResult,
        boundingBoxes: tmResult.boundingBoxes || [],
      };

      console.log("Detection result:", enriched);
      onDetect(enriched);

    } catch (err) {
      console.error("Scan error:", err);

    } finally {
      isProcessingRef.current = false;
    }
  }, [cameraRef, onDetect]);

  // Loop
  useEffect(() => {
    if (!isScanning || !cameraRef?.current) {
      console.log("Scanning paused");
      return;
    }

    console.log("Starting scan loop...");

    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleNext = () => {
      if (isScanningRef.current) {
        timeoutId = setTimeout(async () => {
          await performScan();
          scheduleNext();
        }, INTERVAL_MS);
      }
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      console.log("Scan loop cleaned up");
    };
  }, [isScanning, cameraRef, performScan]);

  return {
    isScanning,
    startScanning: useCallback(() => setIsScanning(true), []),
    stopScanning: useCallback(() => setIsScanning(false), []),
    tfReady,
  };
}
