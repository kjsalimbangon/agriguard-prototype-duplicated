import { useState, useEffect, useCallback, MutableRefObject, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
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

  const INTERVAL_MS = 1000;  // Increased from 700ms
  const MIN_CONFIDENCE = 0.4;
  const allowedCocoClasses = new Set(["bird", "mouse"]);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  // Init TensorFlow + COCO
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const init = async () => {
      try {
        console.log("Initializing TensorFlow and COCO...");
        
        await tfRN.ready();
        console.log("TensorFlow ready");
        
        // Try WebGL backend, fallback to default
        try {
          await tf.setBackend("rn-webgl");
          console.log("WebGL backend set");
        } catch (e) {
          console.warn("WebGL unavailable, using default backend");
        }
        
        if (!mounted) return;
        setTfReady(true);

        console.log("Loading COCO-SSD model...");
        const model = await cocoSsd.load({
          base: 'lite_mobilenet_v2'
        });
        
        if (!model) {
          throw new Error("COCO model returned null");
        }
        
        console.log("COCO model loaded successfully");
        if (!mounted) return;
        setCocoModel(model);
        
      } catch (err) {
        console.error(`Init failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err);
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(init, 2000);  // Retry after 2 seconds
        }
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  const performScan = useCallback(async () => {
    if (!cameraRef?.current) {
      console.warn("No camera ref");
      return;
    }
    
    if (!cocoModel) {
      console.warn("COCO model not loaded");
      return;
    }
    
    if (isProcessingRef.current) {
      console.warn("Already processing, skipping frame");
      return;
    }
    
    isProcessingRef.current = true;
    let tensor: tf.Tensor3D | null = null;

    try {
      // Take photo with URI (more reliable than base64)
      console.log("Taking photo...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        base64: false,  // Don't request base64
      });

      if (!photo?.uri) {
        console.error("takePictureAsync returned no URI");
        return;
      }

      console.log("Resizing image...");
      
      // Resize using ImageManipulator and get base64
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 224, height: 224 } }],
        { base64: true, compress: 0.8 }
      );

      if (!resized.base64) {
        console.error("Image resize failed - no base64");
        return;
      }

      // Decode base64 to tensor
      console.log("Decoding to tensor...");
      const raw = tfRN.base64ToUint8Array(resized.base64);
      tensor = tfRN.decodeJpeg(raw);

      console.log("Running COCO detection...");
      const detections = await cocoModel.detect(tensor);
      console.log(`Found ${detections.length} total detections`);

      // Filter for relevant classes
      const relevantDetections = detections.filter((det: any) => 
        this.allowedCocoClasses.has(det.class) && 
        det.score >= MIN_CONFIDENCE
      );

      console.log(`Filtered to ${relevantDetections.length} relevant detections`);

      if (relevantDetections.length > 0) {
        for (const det of relevantDetections) {
          if (!isScanningRef.current) break;
          
          const [x, y, w, h] = det.bbox.map((n: number) => 
            Math.round(Math.max(0, n))
          );

          if (w <= 0 || h <= 0) continue;

          console.log(`Cropping detection: [${x}, ${y}, ${w}, ${h}]`);
          
          const cropped = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ crop: { originX: x, originY: y, width: w, height: h } }],
            { compress: 0.7 }
          );

          const tmResult = await pestDetectionService.analyzeImage(cropped.uri);

          if (tmResult?.detected) {
            console.log("PEST DETECTED BIATCH:", tmResult.pestType);
            
            const enriched: DetectionResult = {
              ...tmResult,
              boundingBoxes: [{
                x: det.bbox[0],
                y: det.bbox[1],
                width: det.bbox[2],
                height: det.bbox[3],
                confidence: det.score,
                class: det.class
              }]
            };

            onDetect(enriched);
          }
        }
      } else if (detections.length > 0) {
        // Show detections even if not pest-detected (for debugging)
        const result: DetectionResult = {
          detected: false,
          boundingBoxes: detections.slice(0, 5).map((det: any) => ({
            x: det.bbox[0],
            y: det.bbox[1],
            width: det.bbox[2],
            height: det.bbox[3],
            confidence: det.score,
            class: det.class
          })),
          recommendations: []
        };
        onDetect(result);
      }
      
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      if (tensor) tf.dispose(tensor);
      isProcessingRef.current = false;
    }
  }, [cameraRef, cocoModel, onDetect]);

  // Continuous scanning loop
  useEffect(() => {
    if (!isScanning || !cameraRef?.current || !cocoModel) {
      console.log("Scanning paused (isScanning:", isScanning, "cocoReady:", !!cocoModel, ")");
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
  }, [isScanning, cameraRef, cocoModel, performScan]);

  return {
    isScanning,
    startScanning: useCallback(() => {
      console.log("Start scanning pressed");
      setIsScanning(true);
    }, []),
    stopScanning: useCallback(() => {
      console.log("Stop scanning pressed");
      setIsScanning(false);
    }, []),
    tfReady,
    cocoModelReady: cocoModel !== null,
  };
}