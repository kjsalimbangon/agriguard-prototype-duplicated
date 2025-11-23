import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Clock, Play, Square, Calendar, AlertCircle } from 'lucide-react-native';
import { useScheduleMonitoring } from '@/hooks/useScheduleMonitoring';
import { useSchedule } from '@/context/ScheduleContext';

export function ScheduleMonitoringStatus() {
  const { schedules } = useSchedule();
  const { 
    isMonitoring, 
    lastEvent, 
    nextScheduledEvent, 
    startMonitoring, 
    stopMonitoring,
    canStartMonitoring 
  } = useScheduleMonitoring(schedules);

  const formatNextRun = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `in ${diffMinutes}m`;
    } else {
      return 'very soon';
    }
  };

  const activeSchedulesCount = schedules.filter(s => s.active).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            isMonitoring ? styles.statusActive : styles.statusInactive
          ]} />
          <Text style={styles.statusText}>
            Schedule Monitoring: {isMonitoring ? 'Active' : 'Inactive'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isMonitoring ? styles.stopButton : styles.startButton,
            !canStartMonitoring && !isMonitoring && styles.disabledButton
          ]}
          onPress={isMonitoring ? stopMonitoring : startMonitoring}
          disabled={!canStartMonitoring && !isMonitoring}
        >
          {isMonitoring ? (
            <Square size={16} color="white" />
          ) : (
            <Play size={16} color="white" />
          )}
          <Text style={styles.toggleButtonText}>
            {isMonitoring ? 'Stop' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <View style={styles.infoItem}>
          <Calendar size={16} color="#8BA840" />
          <Text style={styles.infoText}>
            {activeSchedulesCount} active schedule{activeSchedulesCount !== 1 ? 's' : ''}
          </Text>
        </View>

        {nextScheduledEvent && (
          <View style={styles.infoItem}>
            <Clock size={16} color="#8BA840" />
            <Text style={styles.infoText}>
              Next: {nextScheduledEvent.schedule.title} {formatNextRun(nextScheduledEvent.nextRun)}
            </Text>
          </View>
        )}

        {lastEvent && (
          <View style={styles.infoItem}>
            <AlertCircle size={16} color="#F2C94C" />
            <Text style={styles.infoText}>
              Last triggered: {lastEvent.title}
            </Text>
          </View>
        )}
      </View>

      {!canStartMonitoring && !isMonitoring && (
        <View style={styles.warningContainer}>
          <AlertCircle size={16} color="#FF6B6B" />
          <Text style={styles.warningText}>
            {schedules.length === 0 
              ? 'No schedules created yet'
              : activeSchedulesCount === 0
              ? 'No active schedules'
              : 'Device not connected'
            }
          </Text>
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
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  toggleButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  info: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 8,
  },
});