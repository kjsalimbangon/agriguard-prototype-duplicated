import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, Battery, Droplets, Activity, RefreshCw } from 'lucide-react-native';
import { useMQTT } from '@/hooks/useMQTT';

export function DeviceStatus() {
  const { isConnected, deviceStatus, connectionError, deviceId, reconnect } = useMQTT();

  const getBatteryIcon = () => {
    if (!deviceStatus?.batteryLevel) return <Battery size={16} color="#999" />;
    
    const level = deviceStatus.batteryLevel;
    const color = level > 50 ? '#4CAF50' : level > 20 ? '#F2C94C' : '#FF6B6B';
    return <Battery size={16} color={color} />;
  };

  const getWaterIcon = () => {
    if (!deviceStatus?.waterLevel) return <Droplets size={16} color="#999" />;
    
    const level = deviceStatus.waterLevel;
    const color = level > 50 ? '#2196F3' : level > 20 ? '#F2C94C' : '#FF6B6B';
    return <Droplets size={16} color={color} />;
  };

  const getStatusColor = () => {
    if (!isConnected) return '#FF6B6B';
    if (!deviceStatus?.online) return '#F2C94C';
    return '#4CAF50';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (!deviceStatus?.online) return 'Device Offline';
    return deviceStatus.currentAction || 'Connected';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          {isConnected ? (
            <Wifi size={16} color={getStatusColor()} />
          ) : (
            <WifiOff size={16} color="#FF6B6B" />
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        <TouchableOpacity onPress={reconnect} style={styles.refreshButton}>
          <RefreshCw size={16} color="#8BA840" />
        </TouchableOpacity>
      </View>

      <Text style={styles.deviceId}>Device: {deviceId}</Text>

      {connectionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{connectionError}</Text>
        </View>
      )}

      {deviceStatus && (
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            {getBatteryIcon()}
            <Text style={styles.metricText}>
              {deviceStatus.batteryLevel ? `${deviceStatus.batteryLevel}%` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metric}>
            {getWaterIcon()}
            <Text style={styles.metricText}>
              {deviceStatus.waterLevel ? `${deviceStatus.waterLevel}%` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metric}>
            <Activity size={16} color="#8BA840" />
            <Text style={styles.metricText}>
              {deviceStatus.currentAction || 'Idle'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginLeft: 8,
  },
  refreshButton: {
    padding: 4,
  },
  deviceId: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#FFEEEE',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF6B6B',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});