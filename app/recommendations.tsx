import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, TriangleAlert as AlertTriangle, Info, Stethoscope, Pill } from 'lucide-react-native';

export default function RecommendationsScreen() {
  const { 
    pestType, 
    confidence, 
    recommendations, 
    description, 
    symptoms, 
    treatment,
    imageUri,
    pesticideImageUri,
    dangerLevel 
  } = useLocalSearchParams();

  const parsedRecommendations = recommendations ? JSON.parse(recommendations as string) : [];
  const confidenceNum = confidence ? parseInt(confidence as string) : 0;

  const getDangerColor = () => {
    switch (dangerLevel) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#F2C94C';
      case 'low': return '#4CAF50';
      default: return '#8BA840';
    }
  };

  const getDangerText = () => {
    switch (dangerLevel) {
      case 'high': return 'High Risk';
      case 'medium': return 'Medium Risk';
      case 'low': return 'Low Risk';
      default: return 'Unknown Risk';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#8BA840" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recommended Actions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.pestCard}>
          <Image source={{ uri: imageUri as string }} style={styles.pestImage} />
          
          <View style={styles.pestInfo}>
            <View style={styles.pestHeader}>
              <AlertTriangle size={20} color={getDangerColor()} />
              <Text style={styles.pestType}>{pestType}</Text>
            </View>
            
            <View style={styles.badges}>
              <View style={[styles.confidenceBadge, { backgroundColor: getDangerColor() }]}>
                <Text style={styles.badgeText}>{confidenceNum}% confidence</Text>
              </View>
              <View style={[styles.dangerBadge, { backgroundColor: getDangerColor() }]}>
                <Text style={styles.badgeText}>{getDangerText()}</Text>
              </View>
            </View>
          </View>
        </View>

        {description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={20} color="#8BA840" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <Text style={styles.sectionContent}>{description}</Text>
          </View>
        )}

        {symptoms && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Stethoscope size={20} color="#8BA840" />
              <Text style={styles.sectionTitle}>Symptoms to Look For</Text>
            </View>
            <Text style={styles.sectionContent}>{symptoms}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pill size={20} color="#8BA840" />
            <Text style={styles.sectionTitle}>Recommended Actions</Text>
          </View>
          
          {parsedRecommendations.length > 0 ? (
            parsedRecommendations.map((recommendation: string, index: number) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationNumber}>
                  <Text style={styles.recommendationNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))
          ) : treatment ? (
            <Text style={styles.sectionContent}>{treatment}</Text>
          ) : (
            <Text style={styles.sectionContent}>
              No specific recommendations available. Please consult with an agricultural expert.
            </Text>
          )}
          
          {pesticideImageUri && (
            <View style={styles.pesticideImageContainer}>
              <Text style={styles.pesticideImageLabel}>Recommended Pesticide:</Text>
              <Image 
                  source={{ uri: `${pesticideImageUri}?cache=${Date.now()}` }}
                  style={styles.pesticideImage}
                  resizeMode="contain"
              />
            </View>
          )}
        </View>

        <View style={styles.warningCard}>
          <AlertTriangle size={20} color="#FF6B6B" />
          <Text style={styles.warningText}>
            Act quickly to prevent further damage to your crops. 
            Early intervention is key to effective pest management.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.scheduleButton}
          onPress={() => router.push('/schedule/setup')}
        >
          <Text style={styles.scheduleButtonText}>Schedule Treatment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backToDetectButton}
          onPress={() => router.push('/(tabs)/detect')}
        >
          <Text style={styles.backToDetectButtonText}>Back to Detection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pestImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  pestInfo: {
    alignItems: 'center',
  },
  pestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pestType: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#333',
    marginLeft: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  confidenceBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dangerBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  badgeText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: 'white',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  sectionContent: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  recommendationNumberText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: 'white',
  },
  recommendationText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  warningText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 12,
    lineHeight: 20,
  },
  pesticideImageContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  pesticideImageLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  pesticideImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  scheduleButton: {
    backgroundColor: '#8BA840',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scheduleButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  backToDetectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8BA840',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backToDetectButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#8BA840',
  },
});