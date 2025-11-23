import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { Clock, MapPin, TrendingUp } from 'lucide-react-native';
import { PestDetection } from '@/database/DatabaseManager';

interface DetectionHistoryProps {
  detections: PestDetection[];
  onDetectionPress?: (detection: PestDetection) => void;
}

export function DetectionHistory({ detections, onDetectionPress }: DetectionHistoryProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return '#4CAF50';
    if (confidence >= 75) return '#F2C94C';
    return '#FF6B6B';
  };

  const renderDetectionItem = ({ item }: { item: PestDetection }) => (
    <TouchableOpacity 
      style={styles.detectionItem}
      onPress={() => onDetectionPress?.(item)}
    >
      <View style={styles.detectionHeader}>
        <Text style={styles.pestType}>{item.pestType}</Text>
        <View style={[
          styles.confidenceBadge,
          { backgroundColor: getConfidenceColor(item.confidence) }
        ]}>
          <Text style={styles.confidenceText}>{item.confidence}%</Text>
        </View>
      </View>

      <View style={styles.detectionDetails}>
        <View style={styles.detailRow}>
          <Clock size={14} color="#666" />
          <Text style={styles.detailText}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        
        {item.location && (
          <View style={styles.detailRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}

      {item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={styles.detectionImage} />
      )}
    </TouchableOpacity>
  );

  if (detections.length === 0) {
    return (
      <View style={styles.emptyState}>
        <TrendingUp size={48} color="#8BA840" />
        <Text style={styles.emptyStateText}>No detections yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Start scanning to detect pests in your area
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detection History</Text>
      <FlatList
        data={detections}
        renderItem={renderDetectionItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  detectionItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pestType: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  confidenceBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  confidenceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: 'white',
  },
  detectionDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  notes: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  detectionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});