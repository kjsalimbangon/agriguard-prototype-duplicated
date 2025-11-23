import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Switch } from 'react-native';
import { router } from 'expo-router';
import { Clock, Calendar, Plus, CreditCard as Edit2, Trash2 } from 'lucide-react-native';
import { useSchedule } from '@/context/ScheduleContext';
import { ScheduleMonitoringStatus } from '@/components/ScheduleMonitoringStatus';
import { useScheduleNotifications } from '@/hooks/useScheduleNotifications';

export default function ScheduleScreen() {
  const { schedules, toggleSchedule, deleteSchedule } = useSchedule();
  useScheduleNotifications(schedules);

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>{item.title}</Text>
        <Switch
          value={item.active}
          onValueChange={() => toggleSchedule(item.id)}
          trackColor={{ false: '#d1d1d1', true: '#c5d86d' }}
          thumbColor={item.active ? '#8BA840' : '#f4f3f4'}
        />
      </View>

      <View style={styles.scheduleDetails}>
        <View style={styles.scheduleTime}>
          <Clock size={16} color="#8BA840" style={styles.icon} />
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.scheduleCalendar}>
          <Calendar size={16} color="#8BA840" style={styles.icon} />
          <Text style={styles.daysText}>{item.days.join(', ')}</Text>
        </View>
      </View>

      <View style={styles.scheduleActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push({
            pathname: '/schedule/setup',
            params: { id: item.id }
          })}
        >
          <Edit2 size={18} color="#8BA840" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => deleteSchedule(item.id)}
        >
          <Trash2 size={18} color="#ff6b6b" />
          <Text style={[styles.actionText, {color: '#ff6b6b'}]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Your Schedules</Text>
        <Text style={styles.headerSubtitle}>
          Set up regular pest detection and monitoring schedules
        </Text>
      </View>

      <ScheduleMonitoringStatus />

      {schedules.length > 0 ? (
        <FlatList
          data={schedules}
          renderItem={renderScheduleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scheduleList}
        />
      ) : (
        <View style={styles.emptyState}>
          <Calendar size={48} color="#8BA840" />
          <Text style={styles.emptyStateText}>No schedules found</Text>
          <Text style={styles.emptyStateSubtext}>
            Create your first monitoring schedule
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/schedule/setup')}
      >
        <Plus size={24} color="white" />
        <Text style={styles.addButtonText}>Add New Schedule</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  scheduleList: {
    padding: 16,
  },
  scheduleItem: {
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
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  scheduleDetails: {
    marginBottom: 16,
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  timeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
  },
  daysText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#555',
  },
  scheduleActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
  },
  actionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8BA840',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#8BA840',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  addButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
});