import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { TriangleAlert as AlertTriangle, X } from 'lucide-react-native';
import { DetectionResult } from '@/services/PestDetectionService';

interface PestNotificationProps {
  detection: DetectionResult;
  onDismiss: () => void;
  onViewDetails: () => void;
}

export function PestNotification({ detection, onDismiss, onViewDetails }: PestNotificationProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      dismissNotification();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getDangerColor = () => {
    if (detection.confidence > 90) return '#FF6B6B';
    if (detection.confidence > 75) return '#F2C94C';
    return '#8BA840';
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          borderLeftColor: getDangerColor(),
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={20} color={getDangerColor()} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Pest Detected!</Text>
            <Text style={styles.pestType}>{detection.pestType}</Text>
          </View>
          <TouchableOpacity onPress={dismissNotification} style={styles.closeButton}>
            <X size={18} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.details}>
          <Text style={styles.confidence}>
            Confidence: {detection.confidence}%
          </Text>
          <Text style={styles.timestamp}>
            {new Date().toLocaleTimeString()}
          </Text>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={onViewDetails}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  pestType: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#FF6B6B',
  },
  closeButton: {
    padding: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confidence: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  timestamp: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#8BA840',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: 'white',
  },
});