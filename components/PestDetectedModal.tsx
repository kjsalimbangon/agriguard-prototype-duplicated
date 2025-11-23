import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { TriangleAlert as AlertTriangle, X } from 'lucide-react-native';

interface PestDetectedModalProps {
  isVisible: boolean;
  onClose: () => void;
  onViewRecommendations: () => void;
  pestType: string;
  confidence: number;
}

export function PestDetectedModal({ 
  isVisible, 
  onClose, 
  onViewRecommendations, 
  pestType, 
  confidence 
}: PestDetectedModalProps) {
  const getConfidenceColor = () => {
    if (confidence >= 90) return '#FF6B6B';
    if (confidence >= 75) return '#F2C94C';
    return '#8BA840';
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color={getConfidenceColor()} />
            </View>

            <Text style={styles.title}>Pest Detected!</Text>
            
            <Text style={styles.pestType}>{pestType}</Text>
            
            <View style={[
              styles.confidenceBadge,
              { backgroundColor: getConfidenceColor() }
            ]}>
              <Text style={styles.confidenceText}>{confidence}% confidence</Text>
            </View>

            <Text style={styles.description}>
              A pest has been identified in your rice field. 
              View recommended actions to protect your crops.
            </Text>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onViewRecommendations}
            >
              <Text style={styles.actionButtonText}>Show Recommended Actions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#333',
    marginBottom: 8,
  },
  pestType: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  confidenceBadge: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  confidenceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#8BA840',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});