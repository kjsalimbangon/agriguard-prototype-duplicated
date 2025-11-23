import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { TriangleAlert as AlertTriangle, Check, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';

interface DetectionResultsProps {
  results: {
    detected: boolean;
    pestType: string;
    confidence: number;
    recommendations: string[];
    species?: {
      imageUri?: string;
      description?: string;
      symptoms?: string;
      treatment?: string;
    };
  };
  onReset: () => void;
}

export function DetectionResults({ results, onReset }: DetectionResultsProps) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.resultHeader}>
        {results.detected ? (
          <View style={styles.detectedBadge}>
            <AlertTriangle size={20} color="#FF6B6B" />
            <Text style={styles.detectedText}>Pest Detected</Text>
          </View>
        ) : (
          <View style={styles.safeBadge}>
            <Check size={20} color="#4CAF50" />
            <Text style={styles.safeText}>No Pests Detected</Text>
          </View>
        )}
        
        {results.detected && (
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>{results.confidence}% confidence</Text>
          </View>
        )}
      </View>
      
      {results.detected && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pest Identified</Text>
            <Text style={styles.pestType}>{results.pestType}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Actions</Text>
            {results.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationNumber}>{index + 1}</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.analyzeButton} onPress={onReset}>
          <RefreshCw size={18} color="white" />
          <Text style={styles.analyzeButtonText}>Scan Again</Text>
        </TouchableOpacity>
        
        {results.detected && (
          <TouchableOpacity style={styles.treatmentButton}>
            <Text style={styles.treatmentButtonText} onPress={() => router.push('/schedule/setup')}>Schedule Treatment</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEEEE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  detectedText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 4,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  safeText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 4,
  },
  confidenceBadge: {
    backgroundColor: '#F2F2F2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  confidenceText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#555',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  pestType: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#FF6B6B',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8BA840',
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  buttonsContainer: {
    padding: 16,
    gap: 12,
  },
  analyzeButton: {
    backgroundColor: '#8BA840',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
  },
  analyzeButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  treatmentButton: {
    backgroundColor: '#F2C94C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  treatmentButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});