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
import { pestDetectionService, DetectionResult } from '@/services/PestDetectionService';
import { BoundingBox } from '@/components/BoundingBox';
import { router } from 'expo-router';

export default function DetectScreen() {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [previewWidth, setPreviewWidth] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);
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
  const [liveDetections, setLiveDetections] = useState<DetectionResult | null>(null);

  const webVideoRef = useRef<HTMLVideoElement>(null);
  const [webStream, setWebStream] = useState<MediaStream | null>(null);

  const { 
    isScanning, 
    startScanning, 
    stopScanning, 
    analyzeImage, 
    detectionHistory,
    refreshData 
  } = usePestDetection();
  
  // Fixed detection callback - properly using pestDetectionService
  useEffect(() => {
    const handleDetection = (result: DetectionResult) => {
      console.log('Live detection received:', result);
      
      if (result.boundingBoxes && result.boundingBoxes.length > 0) {
        console.log('Setting live detections with', result.boundingBoxes.length, 'boxes');
        setLiveDetections(result);
        
        // Show notification if pest detected during scanning
        if (result.detected) {
          setNotificationData(result);
          setShowNotification(true);
        }
      } else {
        // Clear detections if none found
        setLiveDetections(null);
      }
    };

    // Register callback with the service
    pestDetectionService.addDetectionCallback(handleDetection);

    return () => {
      pestDetectionService.removeDetectionCallback(handleDetection);
    };
  }, []);

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
    
    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, []);

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
    if (Platform.OS === 'web' && !capturedImage) {
      const startWebCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: cameraType === 'back' ? 'environment' : 'user' }
          });
          setWebStream(stream);
          
          if (webVideoRef.current) {
            webVideoRef.current.srcObject = stream;
            await webVideoRef.current.play();
          }
        } catch (err) {
          console.error('Failed to start web camera:', err);
        }
      };
      
      startWebCamera();
      
      return () => {
        if (webStream) {
          webStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [cameraType, capturedImage]);

  const handleCapture = async () => {
    setIsCapturing(true);
  
    try {
      if (Platform.OS !== 'web') {
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
            setModalDetectionResult(result);
            setShowPestDetectedModal(true);
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
        // Web fallback
        const capturedImageUri = 'https://images.pexels.com/photos/7828011/pexels-photo-7828011.jpeg';
        setCapturedImage(capturedImageUri);
        setIsCapturing(false);
        setIsAnalyzing(true);
  
        try {
          const result = await analyzeImage(capturedImageUri);
          setIsAnalyzing(false);
  
          if (result.detected) {
            setModalDetectionResult(result);
            setShowPestDetectedModal(true);
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
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDetectionResults(null);
    setShowPestDetectedModal(false);
    setModalDetectionResult(null);
    setLiveDetections(null);
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
              <View 
                style={{ width: '100%', height: '50%', position: 'relative' }}
                onLayout={(e) => {
                  setPreviewWidth(e.nativeEvent.layout.width);
                  setPreviewHeight(e.nativeEvent.layout.height);
                }}
              >
                <Image 
                  source={{ uri: capturedImage }}
                  style={styles.capturedImage}
                />
                {detectionResults?.boundingBoxes && previewWidth > 0 && previewHeight > 0 && (
                  <BoundingBox
                    boxes={detectionResults.boundingBoxes.map(box => ({
                      x: box.x,
                      y: box.y,
                      width: box.width,
                      height: box.height,
                      label: box.class,
                      confidence: box.confidence
                    }))}
                    imageWidth={detectionResults.imageWidth || 224}
                    imageHeight={detectionResults.imageHeight || 224}
                    previewWidth={previewWidth}
                    previewHeight={previewHeight}
                  />
                )}
              </View>
              
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
                  onLayout={(e) => {
                    setPreviewWidth(e.nativeEvent.layout.width);
                    setPreviewHeight(e.nativeEvent.layout.height);
                  }}
                >
                  <View style={styles.overlay}>
                    {!isScanning && <View style={styles.targetFrame} />}
                    {isScanning && liveDetections?.boundingBoxes && liveDetections.boundingBoxes.length > 0 && previewWidth > 0 && previewHeight > 0 && (
                      <>
                        {console.log('About to render boxes:', liveDetections.boundingBoxes.map(box => ({
                          x: box.x,
                          y: box.y,
                          width: box.width,
                          height: box.height,
                          label: box.class,
                          confidence: box.confidence
                        })))}
                        <BoundingBox
                          boxes={liveDetections.boundingBoxes.map(box => ({
                            x: box.x,
                            y: box.y,
                            width: box.width,
                            height: box.height,
                            label: box.class,
                            confidence: box.confidence
                          }))}
                          imageWidth={liveDetections.imageWidth || 640}
                          imageHeight={liveDetections.imageHeight || 480}
                          previewWidth={previewWidth}
                          previewHeight={previewHeight}
                        />
                      </>
                    )}
                    {isScanning && (
                      <View style={styles.scanningIndicator}>
                        <Text style={styles.scanningText}>
                          AI Scanning Active {liveDetections?.boundingBoxes?.length ? `- ${liveDetections.boundingBoxes.length} detected` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </CameraView>
              ) : (
                <View 
                  style={[styles.camera, { position: 'relative' }]}
                  onLayout={(e) => {
                    setPreviewWidth(e.nativeEvent.layout.width);
                    setPreviewHeight(e.nativeEvent.layout.height);
                  }}
                >
                  <video
                    ref={webVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <View style={styles.overlay}>
                    {!isScanning && <View style={styles.targetFrame} />}
                    {isScanning && liveDetections?.boundingBoxes && liveDetections.boundingBoxes.length > 0 && previewWidth > 0 && previewHeight > 0 && (
                      <BoundingBox
                        boxes={liveDetections.boundingBoxes.map(box => ({
                          x: box.x,
                          y: box.y,
                          width: box.width,
                          height: box.height,
                          label: box.class,
                          confidence: box.confidence
                        }))}
                        imageWidth={liveDetections.imageWidth || 640}
                        imageHeight={liveDetections.imageHeight || 480}
                        previewWidth={previewWidth}
                        previewHeight={previewHeight}
                      />
                    )}
                    {isScanning && (
                      <View style={styles.scanningIndicator}>
                        <Text style={styles.scanningText}>
                          AI Scanning Active {liveDetections?.boundingBoxes?.length ? `- ${liveDetections.boundingBoxes.length} detected` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
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
                  onPress={isScanning ? stopScanning : () => startScanning(cameraRef)}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    height: '100%',
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