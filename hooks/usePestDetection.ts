import { useState, useEffect, useCallback, RefObject } from 'react';
import { Camera, CameraType } from 'expo-camera';
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';
import { PestDetection, PestSpecies } from '@/database/DatabaseManager';

export function usePestDetection() {
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      console.log('Camera permission status:', status);
    })();
  }, []);

  const handleDetection = useCallback((result: DetectionResult) => {
    // This will be called when a pest is detected during continuous scanning
    console.log('Pest detected:', result);
    // Refresh detection history
    loadDetectionHistory();
    loadStats();
  }, []);

  const loadDetectionHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const history = await pestDetectionService.getDetectionHistory();
      console.log('Loaded detection history:', history.length, 'detections');
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
      console.log('Loaded pest database:', database.length, 'species');
      setPestDatabase(database);
    } catch (error) {
      console.error('Failed to load pest database:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const detectionStats = await pestDetectionService.getDetectionStats();
      console.log('Loaded detection stats:', detectionStats);
      setStats(detectionStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // In usePestDetection.ts
  const startScanning = useCallback((cameraRef: RefObject<any>) => {
    console.log('startScanning called');
    
    if (!hasPermission) {
      console.warn('Camera permission not granted');
      return;
    }
  
    setIsScanning(true);
    pestDetectionService.addDetectionCallback(handleDetection);
    
    // Pass the ref directly - service will handle web vs native
    pestDetectionService.startContinuousScanning(cameraRef);
    
  }, [handleDetection, hasPermission]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    pestDetectionService.removeDetectionCallback(handleDetection);
    pestDetectionService.stopContinuousScanning();
  }, [handleDetection]);

  const analyzeImage = useCallback(async (imageUri: string): Promise<DetectionResult> => {
    const result = await pestDetectionService.analyzeImage(imageUri);
    // Refresh data after analysis
    await Promise.all([
      loadDetectionHistory(),
      loadStats()
    ]);
    return result;
  }, [loadDetectionHistory, loadStats]);

  const refreshData = useCallback(async () => {
    console.log('Refreshing all pest detection data...');
    await Promise.all([
      loadDetectionHistory(),
      loadPestDatabase(),
      loadStats()
    ]);
  }, [loadDetectionHistory, loadPestDatabase, loadStats]);

  useEffect(() => {
    console.log('Initializing pest detection data...');
    refreshData();

    // Cleanup on unmount
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [refreshData]);

  return {
    isScanning,
    detectionHistory,
    pestDatabase,
    stats,
    isLoading,
    hasPermission,
    startScanning,
    stopScanning,
    analyzeImage,
    refreshData
  };
}