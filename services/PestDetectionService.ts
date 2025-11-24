import { databaseManager, PestDetection, PestSpecies } from '@/database/DatabaseManager';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Tensor config
const BITMAP_DIMENSION = 224;
const TENSORFLOW_CHANNEL = 3;

export interface DetectionResult {
  detected: boolean;
  pestType: string;
  confidence: number;
  recommendations: string[];
  species?: PestSpecies;
  rawScores?: number[];
  index?: number;
}

class PestDetectionService {
  private model: tf.LayersModel | null = null;
  private labels: string[] = [];

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

      // Convert base64 → Uint8Array
      const rawImageData = tf.util.encodeString(processed.base64, 'base64').buffer;
      const imageBytes = new Uint8Array(rawImageData);

      // Decode → resize → normalize to [-1, 1]
      const decodedImage = decodeJpeg(imageBytes, TENSORFLOW_CHANNEL)
        .resizeBilinear([BITMAP_DIMENSION, BITMAP_DIMENSION])
        .toFloat()
        .div(127.5)
        .sub(1)
        .reshape([1, BITMAP_DIMENSION, BITMAP_DIMENSION, TENSORFLOW_CHANNEL]);

      return decodedImage as tf.Tensor4D;
    } catch (err) {
      console.error('❌ Failed to convert URI to tensor:', err);
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
}

export const pestDetectionService = new PestDetectionService();