import { databaseManager, PestDetection, PestSpecies } from '@/database/DatabaseManager';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Tensor config
const BITMAP_DIMENSION = 224;
const TENSORFLOW_CHANNEL = 3;

export interface DetectionResult {
  detected: boolean;
  pestType?: string;
  confidence?: number;
  recommendations?: string[];
  species?: PestSpecies;
  rawScores?: number[];
  index?: number;

  boundingBoxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    class: string;
  }>;
  imageWidth?: number;
  imageHeight?: number;
  uri?: string;
}

class PestDetectionService {
  private model: tf.LayersModel | null = null;
  private labels: string[] = [];
  private cocoModel: any = null;
  private isProcessing: boolean = false;



  // HERE FOR COCO TO DETECT WHAT IT NEEDS                        HEEEEEEEEEEEEEEEEERRRRRREEEEEEEEEEEE!!!!!!
  
  
  
  private allowedCocoClasses = new Set([
    "bird", "mouse", "cat", "dog",
    "bottle", "cup", "bowl", "vase", "chair", "laptop",
    "person", "cell phone", "book", "clock", "scissors"
  ]);

  


  private MIN_CONFIDENCE = 0.4;
  cameraRef: any;

  // 🧩 Load local TFJS model (Teachable Machine export)
  private async loadModel() {
    if (!this.model) {
      await tf.ready();
      console.log('🔧 TensorFlow backend:', tf.getBackend());

      try {
        if (Platform.OS === 'web') {
          const MODEL_URL =
            'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/model.json';
          const META_URL =
            'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/metadata.json';
          this.model = await tf.loadLayersModel(MODEL_URL);
          // Fetch metadata.json for labels
          const metaResponse = await fetch(META_URL);
          const metadata = await metaResponse.json();
          this.labels = metadata.labels;
        } else {
          const modelJson = require('../assets/model/model.json');
          const modelWeights = require('../assets/model/weights.bin');
          const metadata = require('../assets/model/metadata.json');
          this.model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
          this.labels = metadata.labels;
        }

        console.log('✅ Model loaded successfully');
        console.log('📋 Loaded labels:', this.labels);
      } catch (err) {
        console.error('⚠️ Failed to load model:', err);
      }
    }
    return this.model;
  }

  // 🖼 Convert image URI → normalized tensor
  private async uriToTensor(uri: string): Promise<tf.Tensor4D> {
    try {
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: BITMAP_DIMENSION, height: BITMAP_DIMENSION } }],
        { base64: true }
      );

      if (!processed.base64) throw new Error('Image conversion failed: no base64 data.');

      let decodedImage: tf.Tensor3D;

      if (Platform.OS === 'web') {
        // 🌐 Web: Convert base64 to canvas, then to tensor
        const image = new Image();
        image.src = `data:image/jpeg;base64,${processed.base64}`;

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = BITMAP_DIMENSION;
        canvas.height = BITMAP_DIMENSION;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.drawImage(image, 0, 0, BITMAP_DIMENSION, BITMAP_DIMENSION);

        // Convert canvas to tensor
        decodedImage = tf.browser.fromPixels(canvas, TENSORFLOW_CHANNEL)
          .toFloat()
          .div(127.5)
          .sub(1) as tf.Tensor3D;
      } else {
        // 📱 Native: Decode base64 JPEG directly
        const rawImageData = tf.util.encodeString(processed.base64, 'base64').buffer;
        const imageBytes = new Uint8Array(rawImageData);

        decodedImage = decodeJpeg(imageBytes, TENSORFLOW_CHANNEL)
          .toFloat()
          .div(127.5)
          .sub(1) as tf.Tensor3D;
      }

      // Reshape to 4D tensor [batch, height, width, channels]
      const tensor4D = decodedImage
        .resizeBilinear([BITMAP_DIMENSION, BITMAP_DIMENSION])
        .reshape([1, BITMAP_DIMENSION, BITMAP_DIMENSION, TENSORFLOW_CHANNEL]);

      return tensor4D as tf.Tensor4D;
    } catch (err) {
      console.error('Failed to convert URI to tensor:', err);
      throw err;
    }
  }

  // 🧠 Run AI-based detection
  private async aiDetection(imageUri: string): Promise<DetectionResult> {
    const model = await this.loadModel();
    const input = await this.uriToTensor(imageUri);

    // Run prediction
    const predictions = (model.predict(input) as tf.Tensor).dataSync();
    tf.dispose(input);

    // Labels from Teachable Machine (must match training order)
    const labels = this.labels || ['Unknown'];
    const maxIndex = predictions.indexOf(Math.max(...predictions));
    const pestLabel = labels[maxIndex] ?? 'Unknown';
    const confidence = Math.round(predictions[maxIndex] * 100);

    const isNoPest = pestLabel.toLowerCase().includes('no pest');

    const sorted = [...predictions].sort((a, b) => b - a);
    const secondConfidence = Math.round(sorted[1] * 100);
    const diff = confidence - secondConfidence;

    // Detection threshold logic
    const likelyNoise = confidence < 90 || diff < 10;

    console.log('🐛 Prediction scores:', Array.from(predictions));
    console.log('🔍 Max index:', maxIndex, 'Label:', pestLabel, 'Confidence:', confidence);

    if (isNoPest || likelyNoise) {
      return {
        detected: false,
        pestType: '',
        confidence,
        recommendations: ['Continue monitoring', 'No immediate action required'],
        rawScores: Array.from(predictions),
        index: maxIndex,
      };
    }

    const species = await databaseManager.getPestSpeciesByName(pestLabel);

    return {
      detected: true,
      pestType: pestLabel,
      confidence,
      recommendations: species
        ? species.treatment.split('. ')
        : ['Apply appropriate treatment', 'Monitor affected areas'],
      species,
      rawScores: Array.from(predictions),
      index: maxIndex,
    };
  }

  // 🔍 Public API
  async analyzeImage(imageUri: string): Promise<DetectionResult> {
    const result = await this.aiDetection(imageUri);

    if (result.detected) {
      const pestImageUri = result.species?.imageUri || imageUri;
      const detection: Omit<PestDetection, 'id'> = {
        pestType: result.pestType,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        imageUri: pestImageUri,
        notes: 'Detected via TensorFlow.js Teachable Machine model',
      };
      await databaseManager.addPestDetection(detection);
    }

    return result;
  }

  async getDetectionHistory() {
    return await databaseManager.getPestDetections();
  }

  async getPestDatabase() {
    return await databaseManager.getPestSpecies();
  }

  async getDetectionStats() {
    return await databaseManager.getDetectionStats();
  }

  // 📡 Continuous Scanning Support
  private detectionCallbacks: ((result: DetectionResult) => void)[] = [];
  private scanningInterval: NodeJS.Timer | null = null;
  private isScanning: boolean = false;
  private currentScanImageUri: string | null = null;

  // ➕ Register callback
  addDetectionCallback(callback: (result: DetectionResult) => void) {
    if (!this.detectionCallbacks.includes(callback)) {
      this.detectionCallbacks.push(callback);
    }
  }

  // ➖ Remove callback
  removeDetectionCallback(callback: (result: DetectionResult) => void) {
    this.detectionCallbacks = this.detectionCallbacks.filter(cb => cb !== callback);
  }

  // 📸 Set the image URI for continuous scanning
  setScanImageUri(uri: string) {
    this.currentScanImageUri = uri;
  }

  // ▶️ Start continuous scanning with a specific image
  // In PestDetectionService.ts
  // ▶️ Start continuous scanning
  startContinuousScanning(cameraRef?: any) {
    if (this.isScanning) return;

    if (cameraRef) {
      this.cameraRef = cameraRef;
    }

    this.isScanning = true;
    console.log("Continuous scanning started");
    console.log("Platform:", Platform.OS);

    if (Platform.OS === 'web') {
      console.log("Starting web-based scanning");
      this.startWebScanning();
    } else {
      console.log("Starting native camera scanning");
      this.startNativeScanning();
    }
  }

  // 🌐 Web scanning using video element
  private async startWebScanning() {
    // Ensure COCO model is loaded
    if (!this.cocoModel) {
      await this.initializeCocoModel();
    }

    this.scanningInterval = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        
        if (!videoElement) {
          console.warn("No video element found on page");
          this.isProcessing = false;
          return;
        }

        console.log("Have a video element, getting frame...");

        // Create canvas to capture video frame
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || BITMAP_DIMENSION;
        canvas.height = videoElement.videoHeight || BITMAP_DIMENSION;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.warn("Could not get canvas context");
          this.isProcessing = false;
          return;
        }
        
        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Get image data for TensorFlow
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect objects using COCO-SSD
        const detections = await this.detectObjectsFromImageData(imageData);
        
        console.log(`Found ${detections.length} detections`);
        
        // Create proper DetectionResult object
        const result: DetectionResult = {
          detected: detections.length > 0,
          pestType: detections.length > 0 ? detections[0].class : undefined,
          confidence: detections.length > 0 ? Math.round(detections[0].score * 100) : undefined,
          boundingBoxes: detections.map(det => ({
            x: det.bbox[0],
            y: det.bbox[1],
            width: det.bbox[2],
            height: det.bbox[3],
            confidence: det.score,
            class: det.class
          })),
          imageWidth: canvas.width,
          imageHeight: canvas.height,
          recommendations: []
        };
        
        console.log("Calling callbacks with result:", result);
        
        // Notify callbacks with detections
        this.detectionCallbacks.forEach(cb => {
          try {
            cb(result);
          } catch (err) {
            console.error("Error in detection callback:", err);
          }
        });
        
      } catch (err) {
        console.error("Web scan error:", err);
      } finally {
        this.isProcessing = false;
      }
    }, 3000);
  }

  // 📱 Native scanning using camera ref
  private async startNativeScanning() {
    if (!this.cameraRef) {
      console.warn("No camera reference for native scanning");
      return;
    }

    // Ensure COCO model is loaded
    if (!this.cocoModel) {
      console.log("Loading COCO model for native...");
      await this.initializeCocoModel();
    }

    this.scanningInterval = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      let tensor: tf.Tensor3D | null = null;

      try {
        if (!this.cameraRef.current) {
          console.warn("Camera ref became null during scanning");
          this.isProcessing = false;
          return;
        }

        const photo = await this.cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
          base64: true,
        });

        if (!photo?.uri || !photo.base64) {
          console.warn("No photo URI or base64 returned");
          this.isProcessing = false;
          return;
        }

        // Convert to tensor and detect
        const raw = tfRN.base64ToUint8Array(photo.base64);
        tensor = tfRN.decodeJpeg(raw);
        
        const detections = await this.cocoModel.detect(tensor);
        
        console.log(`Found ${detections.length} detections`);
        
        // Filter for relevant classes
        const relevantDetections = detections.filter((det: any) => 
          this.allowedCocoClasses.has(det.class) && 
          det.score >= this.MIN_CONFIDENCE
        );

        // Create proper DetectionResult object
        const result: DetectionResult = {
          detected: relevantDetections.length > 0,
          pestType: relevantDetections.length > 0 ? relevantDetections[0].class : undefined,
          confidence: relevantDetections.length > 0 ? Math.round(relevantDetections[0].score * 100) : undefined,
          boundingBoxes: relevantDetections.map((det: any) => ({
            x: det.bbox[0],
            y: det.bbox[1],
            width: det.bbox[2],
            height: det.bbox[3],
            confidence: det.score,
            class: det.class
          })),
          imageWidth: photo.width,
          imageHeight: photo.height,
          uri: photo.uri,
          recommendations: []
        };

        console.log("Calling callbacks with result:", result);

        // Notify callbacks with detections
        this.detectionCallbacks.forEach(cb => {
          try {
            cb(result);
          } catch (err) {
            console.error("Error in detection callback:", err);
          }
        });
        
      } catch (err) {
        console.error("Native scan error:", err);
      } finally {
        if (tensor) tf.dispose(tensor);
        this.isProcessing = false;
      }
    }, 3000);
  }

  // Helper method to detect objects from ImageData (for web)
  private async detectObjectsFromImageData(imageData: ImageData) {
    if (!this.cocoModel) {
      throw new Error("COCO model not loaded");
    }

    // Convert ImageData to tensor
    const tensor = tf.browser.fromPixels(imageData);
    
    try {
      const detections = await this.cocoModel.detect(tensor as any);
      
      // Filter for relevant classes
      return detections.filter(det => 
        this.allowedCocoClasses.has(det.class) && 
        det.score >= this.MIN_CONFIDENCE
      );
    } finally {
      tensor.dispose();
    }
  }

  // Initialize COCO model if not already loaded
  // Initialize COCO model if not already loaded
  private async initializeCocoModel() {
    if (this.cocoModel) return;

    try {
      if (Platform.OS === 'web') {
        // Web: Use @tensorflow/tfjs and @tensorflow-models/coco-ssd
        console.log("Loading COCO model for web...");
        
        // Ensure TensorFlow.js is ready for web
        await tf.ready();
        
        // Dynamically import for web to avoid bundling issues
        const cocoSsdModule = await import('@tensorflow-models/coco-ssd');
        this.cocoModel = await cocoSsdModule.load({
          base: 'lite_mobilenet_v2' // Use lite model for faster loading
        });
        
        console.log("COCO model loaded successfully for web");
      } else {
        // Native: Use TensorFlow.js React Native
        console.log("Loading COCO model for native...");
        
        await tfRN.ready();
        await tf.setBackend("rn-webgl").catch(() => {
          console.warn("WebGL backend not available, using default");
        });
        
        this.cocoModel = await cocoSsd.load({
          base: 'lite_mobilenet_v2'
        });
        
        console.log("COCO model loaded successfully for native");
      }
    } catch (err) {
      console.error("Failed to load COCO model:", err);
      throw err;
    }
  }
  
  // ⏹ Stop continuous scanning
  stopContinuousScanning() {
    if (!this.isScanning) return;
    this.isScanning = false;
    this.isProcessing = false;

    console.log('Scanning stopped');
  
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = null;
    }
    
    this.cameraRef = null; // Clear camera ref
  }
}

export const pestDetectionService = new PestDetectionService();