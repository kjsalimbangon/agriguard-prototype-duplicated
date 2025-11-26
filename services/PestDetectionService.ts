import { databaseManager, PestDetection, PestSpecies } from '@/database/DatabaseManager';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, Alert } from 'react-native';
import * as tfRN from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';

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
  private isProcessing: boolean = false;
  private MIN_CONFIDENCE = 0.4;
  private tfInitialized: boolean = false;
  private modelLoading: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private modelLoadPromise: Promise<tf.LayersModel> | null = null;
  cameraRef: any;
  private cocoModel: any = null;

  // Initialize TensorFlow ONCE with improved error handling
  async initializeTensorFlow(): Promise<void> {
    if (this.initializationPromise) {
      console.log('⏳ TF initialization in progress, waiting...');
      return this.initializationPromise;
    }

    if (this.tfInitialized) {
      console.log('✅ TF already initialized');
      return Promise.resolve();
    }

    this.initializationPromise = (async () => {
      try {
        console.log('🚀 Starting TensorFlow initialization...');
        
        if (Platform.OS === 'web') {
          await tf.ready();
          console.log('✅ TensorFlow.js ready for web');
        } else {
          // Native: Initialize with retries
          let retries = 3;
          let lastError: Error | null = null;

          while (retries > 0) {
            try {
              console.log(`🔄 Initializing TensorFlow React Native (attempt ${4 - retries}/3)...`);
              await tfRN.ready();
              console.log('✅ TensorFlow React Native ready');
              
              // Wait a bit for backend to stabilize
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Try to set backend
              try {
                await tf.setBackend('rn-webgl');
                console.log('✅ WebGL backend set');
              } catch (e) {
                console.warn('⚠️ WebGL not available, using CPU backend');
                await tf.setBackend('cpu');
                console.log('✅ CPU backend set');
              }
              
              // Verify backend is ready
              await tf.ready();
              const backend = tf.getBackend();
              console.log('✅ TensorFlow backend active:', backend);
              
              this.tfInitialized = true;
              return; // Success!
              
            } catch (err) {
              lastError = err as Error;
              console.error(`❌ Attempt ${4 - retries} failed:`, err);
              retries--;
              
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
          
          // All retries failed
          throw new Error(`TensorFlow initialization failed after 3 attempts: ${lastError?.message}`);
        }
        
      } catch (err) {
        console.error('❌ Failed to initialize TensorFlow:', err);
        this.initializationPromise = null;
        this.tfInitialized = false;
        throw err;
      }
    })();

    return this.initializationPromise;
  }

  // Load model with proper asset handling for Android
  async loadModel(): Promise<tf.LayersModel> {
    // Return existing model
    if (this.model) {
      console.log('✅ Model already loaded');
      return this.model;
    }

    // Wait if already loading
    if (this.modelLoadPromise) {
      console.log('⏳ Model loading in progress, waiting...');
      return this.modelLoadPromise;
    }

    this.modelLoadPromise = (async () => {
      try {
        // CRITICAL: Ensure TensorFlow is initialized FIRST
        console.log('🔍 Ensuring TensorFlow is ready...');
        await this.initializeTensorFlow();
        
        // Additional wait to ensure backend is stable
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📦 Loading Teachable Machine model...');

        if (Platform.OS === 'web') {
          const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/model.json';
          const META_URL = 'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/metadata.json';
          
          console.log('🌐 Loading from web URL...');
          this.model = await tf.loadLayersModel(MODEL_URL);
          
          const metaResponse = await fetch(META_URL);
          const metadata = await metaResponse.json();
          this.labels = metadata.labels;
          
        } else {
          console.log('📱 MINIMAL TEST - Loading from web only...');
          
          // Force using fetch with full error details
          const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/model.json';
          
          console.log('Testing network...');
          const testFetch = await fetch(MODEL_URL);
          console.log('Network status:', testFetch.status, testFetch.statusText);
          const testJson = await testFetch.json();
          console.log('Model JSON fetched:', Object.keys(testJson));
          
          console.log('Calling tf.loadLayersModel...');
          this.model = await tf.loadLayersModel(MODEL_URL);
          console.log('Model loaded!');
          
          const META_URL = 'https://teachablemachine.withgoogle.com/models/CBLMG2sAF/metadata.json';
          const metaResponse = await fetch(META_URL);
          const metadata = await metaResponse.json();
          this.labels = metadata.labels;
          console.log('Labels:', this.labels);
        }

        console.log('✅ Model loaded successfully!');
        console.log('📐 Model input shape:', this.model.inputs[0].shape);
        
        return this.model;
        
      } catch (err) {
        console.error('❌ Model load failed:', err);
        console.error('Stack:', err instanceof Error ? err.stack : 'No stack');
        this.model = null;
        this.modelLoadPromise = null;
        throw err;
      }
    })();

    return this.modelLoadPromise;
  }

  // Convert image URI → normalized tensor
  private async uriToTensor(uri: string): Promise<tf.Tensor4D> {
    try {
      console.log('🖼️ Converting image to tensor...');
      
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: BITMAP_DIMENSION, height: BITMAP_DIMENSION } }],
        { base64: true, compress: 0.8 }
      );

      if (!processed.base64) {
        throw new Error('Image conversion failed: no base64 data');
      }

      let decodedImage: tf.Tensor3D;

      if (Platform.OS === 'web') {
        const image = new Image();
        image.src = `data:image/jpeg;base64,${processed.base64}`;

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = BITMAP_DIMENSION;
        canvas.height = BITMAP_DIMENSION;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.drawImage(image, 0, 0, BITMAP_DIMENSION, BITMAP_DIMENSION);

        decodedImage = tf.browser.fromPixels(canvas, TENSORFLOW_CHANNEL)
          .toFloat()
          .div(127.5)
          .sub(1) as tf.Tensor3D;
      } else {
        const rawImageData = tf.util.encodeString(processed.base64, 'base64').buffer;
        const imageBytes = new Uint8Array(rawImageData);

        decodedImage = decodeJpeg(imageBytes, TENSORFLOW_CHANNEL)
          .toFloat()
          .div(127.5)
          .sub(1) as tf.Tensor3D;
      }

      const tensor4D = decodedImage
        .resizeBilinear([BITMAP_DIMENSION, BITMAP_DIMENSION])
        .reshape([1, BITMAP_DIMENSION, BITMAP_DIMENSION, TENSORFLOW_CHANNEL]);

      return tensor4D as tf.Tensor4D;
      
    } catch (err) {
      console.error('❌ Failed to convert URI to tensor:', err);
      throw err;
    }
  }

  // Run AI-based detection
  private async aiDetection(imageUri: string): Promise<DetectionResult> {
    try {
      console.log('🤖 Starting AI detection...');
      
      const model = await this.loadModel();
      
      if (!model) {
        throw new Error('Model failed to load');
      }

      const input = await this.uriToTensor(imageUri);

      console.log('🔮 Running prediction...');
      const predictions = (model.predict(input) as tf.Tensor).dataSync();
      tf.dispose(input);

      const labels = this.labels || ['Unknown'];
      const maxIndex = predictions.indexOf(Math.max(...predictions));
      const pestLabel = labels[maxIndex] ?? 'Unknown';
      const confidence = Math.round(predictions[maxIndex] * 100);

      const isNoPest = pestLabel.toLowerCase().includes('no pest');
      const sorted = [...predictions].sort((a, b) => b - a);
      const secondConfidence = Math.round(sorted[1] * 100);
      const diff = confidence - secondConfidence;
      const likelyNoise = confidence < 90 || diff < 10;

      console.log(`📊 Prediction: ${pestLabel} ${confidence}%`);

      if (isNoPest || likelyNoise) {
        return {
          detected: false,
          pestType: '',
          confidence,
          recommendations: ['Continue monitoring'],
          rawScores: Array.from(predictions),
          index: maxIndex,
        };
      }

      const species = await databaseManager.getPestSpeciesByName(pestLabel);

      return {
        detected: true,
        pestType: pestLabel,
        confidence,
        recommendations: species ? species.treatment.split('. ') : ['Apply treatment'],
        species,
        rawScores: Array.from(predictions),
        index: maxIndex,
      };
      
    } catch (err) {
      console.error('❌ AI detection failed:', err);
      throw err;
    }
  }

  async analyzeImage(imageUri: string): Promise<DetectionResult> {
    const result = await this.aiDetection(imageUri);

    if (result.detected) {
      const detection: Omit<PestDetection, 'id'> = {
        pestType: result.pestType,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        imageUri: result.species?.imageUri || imageUri,
        notes: 'Detected via TensorFlow.js',
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

  // Continuous Scanning
  private detectionCallbacks: ((result: DetectionResult) => void)[] = [];
  private scanningInterval: NodeJS.Timer | null = null;
  private isScanning: boolean = false;

  addDetectionCallback(callback: (result: DetectionResult) => void) {
    if (!this.detectionCallbacks.includes(callback)) {
      this.detectionCallbacks.push(callback);
    }
  }

  removeDetectionCallback(callback: (result: DetectionResult) => void) {
    this.detectionCallbacks = this.detectionCallbacks.filter(cb => cb !== callback);
  }

  async startContinuousScanning(cameraRef?: any) {
    if (this.isScanning) {
      console.log('⚠️ Already scanning');
      return;
    }

    if (cameraRef) {
      this.cameraRef = cameraRef;
    }

    console.log('🎬 Starting continuous scanning...');

    // CRITICAL: Pre-initialize everything
    try {
      console.log('🔧 Pre-initializing TensorFlow...');
      await this.initializeTensorFlow();
      
      console.log('📦 Pre-loading model...');
      await this.loadModel();
      
      console.log('✅ Ready to scan!');
    } catch (err) {
      console.error('❌ Cannot start scanning:', err);
      Alert.alert('Error', 'Failed to initialize AI model. Please restart the app.');
      return;
    }

    this.isScanning = true;

    // Choose scanning method
    if (Platform.OS === 'web') {
      console.log('🌐 Starting web scanning');
      this.startWebScanning();
    } else {
      console.log('📱 Starting native scanning');
      this.startNativeScanning();
    }
  }

  private async startWebScanning() {
  this.scanningInterval = setInterval(async () => {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const video = document.querySelector("video") as HTMLVideoElement;
      if (!video) {
        this.isProcessing = false;
        return;
      }

      // Draw current frame to canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        this.isProcessing = false;
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to image blob
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/jpeg")
      );

      if (!blob) {
        this.isProcessing = false;
        return;
      }

      // Convert blob → base64
      const reader = new FileReader();
      const base64 = await new Promise<string>(res => {
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Remove prefix "data:image/jpeg;base64,"
      const base64Data = base64.split(",")[1];

      // Roboflow API call
      const response = await fetch(
        `https://serverless.roboflow.com/binkyboi/workflows/find-rats-snails-rice-black-bugs-and-grasshoppers-2`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: "y77kJVHKaY1uxX08C5OZ",
            inputs: { image: { type: "base64", value: base64Data } }
          })
        }
      );

      const resultJson = await response.json();

      const detections = resultJson?.predictions ?? [];
    try {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        
        if (!videoElement) {
          this.isProcessing = false;
          return;
        }
      const result: DetectionResult = {
        detected: detections.length > 0,
        confidence: detections[0]?.confidence ?? 0,
        pestType: detections[0]?.class ?? "",
        boundingBoxes: detections.map((d: any) => ({
          x: d.x - d.width / 2,
          y: d.y - d.height / 2,
          width: d.width,
          height: d.height,
          confidence: d.confidence,
          class: d.class
        })),
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        recommendations: []
      };

      // Trigger callbacks
      this.detectionCallbacks.forEach(cb => {
          try {
            cb(result);
          } catch (err) {
            console.error("❌ Callback error:", err);
          }
        });

    } catch (err) {
      console.error("Roboflow scanning error:", err);
    } finally {
        this.isProcessing = false;
    }
  }, 1200); // 1.2 seconds per frame
}

  // Web scanning using COCO-SSD
  /*private async startWebScanning() {
    try {
      if (!this.cocoModel) {
        console.log("📦 Loading COCO model for web...");
        const cocoSsdModule = await import('@tensorflow-models/coco-ssd');
        this.cocoModel = await cocoSsdModule.load({ base: 'lite_mobilenet_v2' });
        console.log("✅ COCO model loaded");
      }
    } catch (err) {
      console.error("❌ Failed to load COCO:", err);
      return;
    }

    this.scanningInterval = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        
        if (!videoElement) {
          this.isProcessing = false;
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || BITMAP_DIMENSION;
        canvas.height = videoElement.videoHeight || BITMAP_DIMENSION;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          this.isProcessing = false;
          return;
        }
        
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const tensor = tf.browser.fromPixels(canvas);
        const detections = await this.cocoModel.detect(tensor);
        tensor.dispose();
        
        const result: DetectionResult = {
          detected: detections.length > 0,
          pestType: detections.length > 0 ? detections[0].class : undefined,
          confidence: detections.length > 0 ? Math.round(detections[0].score * 100) : undefined,
          boundingBoxes: detections.slice(0, 5).map((det: any) => ({
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
        
        this.detectionCallbacks.forEach(cb => {
          try {
            cb(result);
          } catch (err) {
            console.error("❌ Callback error:", err);
          }
        });
        
      } catch (err) {
        console.error("❌ Web scan error:", err);
      } finally {
        this.isProcessing = false;
      }
    }, 3000);
  }*/

  private async startNativeScanning() {
    if (!this.cameraRef?.current) {
      console.warn('⚠️ No camera reference');
      return;
    }

    if (!this.model) {
      console.error('❌ Model not loaded');
      return;
    }

    console.log('▶️ Starting scan loop...');

    this.scanningInterval = setInterval(async () => {
      if (this.isProcessing) {
        return;
      }
      
      this.isProcessing = true;

      let imageTensor: tf.Tensor3D | null = null;
      let tensor: tf.Tensor4D | null = null;

      try {
        if (!this.cameraRef.current) {
          this.isProcessing = false;
          return;
        }

        const photo = await this.cameraRef.current.takePictureAsync({
          quality: 0.6,
          base64: true,
        });

        if (!photo?.base64) {
          this.isProcessing = false;
          return;
        }

        const raw = tfRN.base64ToUint8Array(photo.base64);
        imageTensor = tfRN.decodeJpeg(raw);
        
        const resized = tf.image.resizeBilinear(
          imageTensor.expandDims(0) as tf.Tensor4D,
          [BITMAP_DIMENSION, BITMAP_DIMENSION]
        );
        
        tensor = resized.toFloat().div(127.5).sub(1) as tf.Tensor4D;

        const predictions = (this.model!.predict(tensor) as tf.Tensor).dataSync();
        
        const maxIndex = predictions.indexOf(Math.max(...predictions));
        const pestLabel = this.labels[maxIndex] ?? 'Unknown';
        const confidence = Math.round(predictions[maxIndex] * 100);

        const isNoPest = pestLabel.toLowerCase().includes('no pest');

        if (confidence >= 75 && !isNoPest) {
          const species = await databaseManager.getPestSpeciesByName(pestLabel);

          const result: DetectionResult = {
            detected: true,
            pestType: pestLabel,
            confidence,
            recommendations: species ? species.treatment.split('. ') : [],
            species,
            rawScores: Array.from(predictions),
            boundingBoxes: [],
          };

          console.log('🐛 PEST DETECTED:', pestLabel);

          const detection: Omit<PestDetection, 'id'> = {
            pestType: pestLabel,
            confidence,
            timestamp: new Date().toISOString(),
            imageUri: photo.uri,
            notes: 'Continuous scanning detection',
          };
          await databaseManager.addPestDetection(detection);

          this.detectionCallbacks.forEach(cb => cb(result));
        } else {
          this.detectionCallbacks.forEach(cb => cb({
            detected: false,
            confidence,
            recommendations: [],
            boundingBoxes: [],
          }));
        }
        
      } catch (err) {
        console.error('❌ Scan error:', err);
      } finally {
        if (tensor) tf.dispose(tensor);
        if (imageTensor) imageTensor.dispose();
        this.isProcessing = false;
      }
    }, 3000);
  }

  stopContinuousScanning() {
    if (!this.isScanning) return;
    
    console.log('⏹️ Stopping scan...');
    this.isScanning = false;
    this.isProcessing = false;
  
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = null;
    }
    
    this.cameraRef = null;
  }
}

export const pestDetectionService = new PestDetectionService();