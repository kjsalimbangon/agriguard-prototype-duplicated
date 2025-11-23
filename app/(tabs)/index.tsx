import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Camera, CalendarPlus, Calendar, Clipboard, Wifi } from 'lucide-react-native';
import { StatusCard } from '@/components/StatusCard';
import { QuickActionButton } from '@/components/QuickActionButton';
import { usePestDetection } from '@/hooks/usePestDetection';
import { DeviceStatus } from '@/components/DeviceStatus';
import { SprayControls } from '@/components/SprayControls';
import { ScheduleMonitoringStatus } from '@/components/ScheduleMonitoringStatus';
import { useMQTT } from '@/hooks/useMQTT';

export default function DashboardScreen() {
  const { isConnected } = useMQTT();
  const { stats, isScanning, startScanning, stopScanning, refreshData, isLoading } = usePestDetection();

  // Refresh data when component mounts or becomes focused
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [refreshData]);

  const formatLastDetection = () => {
    if (stats.totalDetections === 0) {
      return 'None';
    } else if (stats.todayDetections > 0) {
      return 'Today';
    } else {
      return 'This week';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Text style={styles.titleText}>AGRIGUARD CONTROL PANEL</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.statusIndicator, 
            isConnected ? styles.statusConnected : styles.statusDisconnected
          ]} />
          <Text style={styles.statusText}>
            STATUS: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
        
        <View style={styles.scanningStatus}>
          <View style={[
            styles.statusIndicator, 
            isScanning ? styles.statusScanning : styles.statusIdle
          ]} />
          <Text style={styles.statusText}>
            SCANNING: {isScanning ? 'ACTIVE' : 'IDLE'}
          </Text>
        </View>
      </View>

      <DeviceStatus />
      
      <SprayControls />

      <ScheduleMonitoringStatus />

      <View style={styles.statsContainer}>
        <StatusCard 
          title="Last Detection"
          value={formatLastDetection()}
          icon={<AlertTriangle size={24} color="#8BA840" />}
        />
        <StatusCard 
          title="Today's Count"
          value={String(stats.todayDetections)}
          icon={<CheckCircle size={24} color="#8BA840" />}
        />
        <StatusCard 
          title="Total Found"
          value={String(stats.totalDetections)}
          icon={<AlertTriangle size={24} color="#F2C94C" />}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Most Common Pest</Text>
          <Text style={styles.statValue}>
            {stats.totalDetections > 0 ? stats.mostCommonPest : 'None'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg. Confidence</Text>
          <Text style={styles.statValue}>
            {stats.totalDetections > 0 ? `${stats.averageConfidence.toFixed(1)}%` : 'N/A'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <QuickActionButton 
          title="Set Up Schedule"
          icon={<CalendarPlus size={32} color="#8BA840" />}
          onPress={() => router.push('/schedule/setup')}
        />
        <QuickActionButton 
          title="Reports"
          icon={<Clipboard size={32} color="#8BA840" />}
          onPress={() => router.push('/reports')}
        />
        <QuickActionButton 
          title="Manage Schedule"
          icon={<Calendar size={32} color="#8BA840" />}
          onPress={() => router.push('/schedule')}
        />
        <QuickActionButton 
          title="Detect"
          icon={<Camera size={32} color="#8BA840" />}
          onPress={() => router.push('/detect')}
        />
      </View>

      <View style={styles.scanningControls}>
        <TouchableOpacity 
          style={[
            styles.scanButton,
            isScanning ? styles.scanButtonActive : styles.scanButtonInactive
          ]}
          onPress={isScanning ? stopScanning : startScanning}
        >
          <Text style={[
            styles.scanButtonText,
            isScanning ? styles.scanButtonTextActive : styles.scanButtonTextInactive
          ]}>
            {isScanning ? 'Stop Continuous Scanning' : 'Start Continuous Scanning'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.detectButton}
        onPress={() => router.push('/detect')}
      >
        <Text style={styles.detectButtonText}>Manual Pest Detection</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#555',
  },
  titleText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#8BA840',
  },
  statusContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  scanningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#F44336',
  },
  statusScanning: {
    backgroundColor: '#2196F3',
  },
  statusIdle: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#555',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  scanningControls: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  scanButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  scanButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  scanButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: '#8BA840',
  },
  scanButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  scanButtonTextActive: {
    color: 'white',
  },
  scanButtonTextInactive: {
    color: '#8BA840',
  },
  detectButton: {
    backgroundColor: '#8BA840',
    borderRadius: 8,
    padding: 16,
    margin: 24,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  detectButtonText: {
    fontFamily: 'Poppins-SemiBold',
    color: 'white',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
  },
});