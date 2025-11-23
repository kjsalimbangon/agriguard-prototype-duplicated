import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { Camera, RefreshCw, Image as ImageIcon, CircleAlert as AlertCircle, Play, Square } from 'lucide-react-native';
import { DetectionResults } from '@/components/DetectionResults';
import { PestNotification } from '@/components/PestNotification';
import { DetectionHistory } from '@/components/DetectionHistory';
import { PestDetectedModal } from '@/components/PestDetectedModal';
import { usePestDetection } from '@/hooks/usePestDetection';
import { DetectionResult } from '@/services/PestDetectionService';
import { router } from 'expo-router';

export default function DetectScreen() {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionResult | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'history'>('camera');
  const [showPestDetectedModal, setShowPestDetectedModal] = useState(false);
  const [modalDetectionResult, setModalDetectionResult] = useState<DetectionResult | null>(null);
  const cameraRef = useRef(null);
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);

  const { 
    isScanning, 
    startScanning, 
    stopScanning, 
    analyzeImage, 
    detectionHistory,
    refreshData 
  } = usePestDetection(cameraRef);

  useEffect(() => {
    requestPermission();
    
    // Load sound file
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/pest_alert.mp3')
        );
        setSoundObject(sound);
      } catch (error) {
        console.error('Failed to load sound:', error);
      }
    };
    
    loadSound();
    
    // Cleanup function
    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, []);

  // Play sound when modal is shown
  useEffect(() => {
    const playSound = async () => {
      if (showPestDetectedModal && soundObject) {
        try {
          await soundObject.replayAsync();
        } catch (error) {
          console.error('Failed to play sound:', error);
        }
      }
    };
    
    playSound();
  }, [showPestDetectedModal, soundObject]);

  useEffect(() => {
    // Listen for continuous scanning detections
    const handleDetection = (result: DetectionResult) => {
      if (result.detected) {
        setNotificationData(result);
        setShowNotification(true);
        setPesticideImageUri(result.pesticideImageUri);

      }
    };

    // This would be handled by the usePestDetection hook
    // The notification will show when continuous scanning detects a pest
  }, []);

  const handleCapture = async () => {
    setIsCapturing(true);
  
    try {
      if (Platform.OS !== 'web') {
        // Native: actual camera capture
        if (!cameraRef.current) {
          setIsCapturing(false);
          return;
        }
  
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
  
        console.log('Photo captured:', photo.uri);
        setCapturedImage(photo.uri);
        setIsCapturing(false);
        setIsAnalyzing(true);
  
        try {
          const result = await analyzeImage(photo.uri);
          setIsAnalyzing(false);
  
          if (result.detected) {
            // Show modal for detected pest
            setModalDetectionResult(result);
            setShowPestDetectedModal(true);
            // Update the displayed image to show the actual pest
            if (result.species?.imageUri) {
              setCapturedImage(result.species.imageUri);
            }
          } else {
            setDetectionResults(result);
          }
        } catch (error) {
          console.error('Analysis failed:', error);
          setIsAnalyzing(false);
        }
      } else {
        // Web: immediate mock simulation (no delay, no cameraRef check)
        // Use a generic captured image placeholder for web
        const capturedImageUri = 'https://images.pexels.com/photos/7828011/pexels-photo-7828011.jpeg';
        setCapturedImage(capturedImageUri);
        setIsCapturing(false);
        setIsAnalyzing(true);
  
        try {
          const result = await analyzeImage(capturedImageUri);
          setIsAnalyzing(false);
  
          if (result.detected) {
            // Show modal for detected pest
            setModalDetectionResult(result);
            setShowPestDetectedModal(true);
            // Update the displayed image to show the actual pest
            if (result.species?.imageUri) {
              setCapturedImage(result.species.imageUri);
            }
          } else {
            setDetectionResults(result);
          }
        } catch (error) {
          console.error('Web analysis failed:', error);
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      setIsCapturing(false);
  
      // Fallback only makes sense on native if camera fails
      // On web, we already handled it above, so this fallback is primarily for native
      if (Platform.OS !== 'web') {
        const fallbackImageUri = 'https://images.pexels.com/photos/7828011/pexels-photo-7828011.jpeg';
        setCapturedImage(fallbackImageUri);
        setIsAnalyzing(true);
  
        try {
          const result = await analyzeImage(fallbackImageUri);
          setIsAnalyzing(false);
  
          if (result.detected) {
            // Show modal for detected pest
            setModalDetectionResult(result);
            setShowPestDetectedModal(true);
            // Update the displayed image to show the actual pest
            if (result.species?.imageUri) {
              setCapturedImage(result.species.imageUri);
            }
          } else {
            setDetectionResults(result);
          }
        } catch (fallbackError) {
          console.error('Fallback analysis failed:', fallbackError);
          setIsAnalyzing(false);
        }
      }
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDetectionResults(null);
    setShowPestDetectedModal(false);
    setModalDetectionResult(null);
    refreshData();
  };

  const handleNotificationDismiss = () => {
    setShowNotification(false);
    setNotificationData(null);
  };

  const handleViewNotificationDetails = () => {
    setShowNotification(false);
    if (notificationData) {
      if (notificationData.detected) {
        setModalDetectionResult(notificationData);
        setShowPestDetectedModal(true);
      } else {
        setDetectionResults(notificationData);
      }
      setActiveTab('camera');
    }
  };

  const handleViewRecommendations = () => {
    if (!modalDetectionResult) return;
    
    setShowPestDetectedModal(false);
    
    // Navigate to recommendations page with detection data
    router.push({
      pathname: '/recommendations',
      params: {
        pestType: modalDetectionResult.pestType,
        confidence: modalDetectionResult.confidence.toString(),
        recommendations: JSON.stringify(modalDetectionResult.recommendations),
        description: modalDetectionResult.species?.description || '',
        symptoms: modalDetectionResult.species?.symptoms || '',
        treatment: modalDetectionResult.species?.treatment || '',
        imageUri: modalDetectionResult.species?.imageUri || '',
        pesticideImageUri: modalDetectionResult.species?.pesticideImageUri || '',
        dangerLevel: modalDetectionResult.species?.dangerLevel || 'medium',
      }
    });
  };

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <AlertCircle size={48} color="#8BA840" />
        <Text style={styles.permissionText}>
          We need camera permission to detect pests
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <AlertCircle size={48} color="#8BA840" />
        <Text style={styles.permissionText}>
          Camera permission is needed for pest detection
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showNotification && notificationData && (
        <PestNotification
          detection={notificationData}
          onDismiss={handleNotificationDismiss}
          onViewDetails={handleViewNotificationDetails}
        />
      )}

      {showPestDetectedModal && modalDetectionResult && (
        <PestDetectedModal
          isVisible={showPestDetectedModal}
          onClose={() => setShowPestDetectedModal(false)}
          onViewRecommendations={handleViewRecommendations}
          pestType={modalDetectionResult.pestType}
          confidence={modalDetectionResult.confidence}
        />
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'camera' && styles.activeTab]}
          onPress={() => setActiveTab('camera')}
        >
          <Text style={[styles.tabText, activeTab === 'camera' && styles.activeTabText]}>
            Camera
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'camera' ? (
        <>
          {capturedImage ? (
            <View style={styles.resultContainer}>
              <Image 
                source={{ uri: capturedImage }}
                style={styles.capturedImage}
              />
              
              {isAnalyzing ? (
                <View style={styles.analyzingContainer}>
                  <RefreshCw size={36} color="#8BA840" style={styles.spinningIcon} />
                  <Text style={styles.analyzingText}>Analyzing with AI...</Text>
                  <Text style={styles.analyzingSubtext}>
                    Using TensorFlow JS for pest detection
                  </Text>
                </View>
              ) : detectionResults ? (
                <DetectionResults 
                  results={detectionResults}
                  onReset={resetCapture}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              {Platform.OS !== 'web' ? (
                <CameraView 
                  style={styles.camera}
                  facing={cameraType}
                  ref={cameraRef}
                >
                  <View style={styles.overlay}>
                    <View style={styles.targetFrame} />
                    {isScanning && (
                      <View style={styles.scanningIndicator}>
                        <Text style={styles.scanningText}>AI Scanning Active</Text>
                      </View>
                    )}
                  </View>
                </CameraView>
              ) : (
                <View style={styles.webFallback}>
                  <Camera size={48} color="#8BA840" />
                  <Text style={styles.webFallbackText}>
                    Camera preview not available on web.
                    Tap the button below to simulate AI pest detection.
                  </Text>
                  {isScanning && (
                    <Text style={styles.scanningText}>AI Scanning Active</Text>
                  )}
                </View>
              )}
              
              <View style={styles.controlsContainer}>
                <TouchableOpacity 
                  style={styles.flipButton}
                  onPress={() => setCameraType(
                    cameraType === 'back' ? 'front' : 'back'
                  )}
                >
                  <RefreshCw size={24} color="#8BA840" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={handleCapture}
                  disabled={isCapturing}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.scanToggleButton}
                  onPress={isScanning ? stopScanning : startScanning}
                >
                  {isScanning ? (
                    <Square size={24} color="#FF6B6B" />
                  ) : (
                    <Play size={24} color="#8BA840" />
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={styles.instructionText}>
                Position the pest within the frame and tap capture for AI analysis, or enable continuous AI scanning
              </Text>
            </View>
          )}
        </>
      ) : (
        <DetectionHistory 
          detections={detectionHistory}
          onDetectionPress={(detection) => {
            console.log('Detection pressed:', detection);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8BA840',
  },
  tabText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#8BA840',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    color: '#555',
  },
  permissionButton: {
    backgroundColor: '#8BA840',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: 'white',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#e0e0e0',
  },
  webFallbackText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    color: '#555',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#F2C94C',
    borderRadius: 8,
  },
  scanningIndicator: {
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(139, 168, 64, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanningText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  flipButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: '#8BA840',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#8BA840',
  },
  scanToggleButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  instructionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    padding: 16,
    backgroundColor: 'white',
  },
  resultContainer: {
    flex: 1,
  },
  capturedImage: {
    width: '100%',
    height: '50%',
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  spinningIcon: {
    marginBottom: 16,
  },
  analyzingText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#555',
    marginBottom: 8,
  },
  analyzingSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8BA840',
    textAlign: 'center',
  },
});