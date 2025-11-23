import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Calendar, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useSchedule } from '@/context/ScheduleContext';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const NOTIFICATION_OPTIONS = [
  { id: '1', label: '1 min before' },
  { id: '15', label: '15 min before' },
  { id: '30', label: '30 min before' },
  { id: '60', label: '1 hour before' }
];

export default function ScheduleSetupScreen() {
  const { id } = useLocalSearchParams();
  const { schedules, addSchedule, updateSchedule } = useSchedule();
  
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [period, setPeriod] = useState('AM');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [notificationMinutes, setNotificationMinutes] = useState('15');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (id) {
      const schedule = schedules.find(s => s.id === id);
      if (schedule) {
        setTitle(schedule.title);
        const [timeValue, timePeriod] = schedule.time.split(' ');
        setTime(timeValue);
        setPeriod(timePeriod);
        setSelectedDays(schedule.days);
        setNotificationMinutes(schedule.notificationMinutes || '15');
      }
    }
  }, [id, schedules]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setValidationError('Please enter a title for your schedule');
      return;
    }
    
    if (selectedDays.length === 0) {
      setValidationError('Please select at least one day');
      return;
    }
    
    // Check for duplicate schedules (same time and days)
    const scheduleTime = `${time} ${period}`;
    const isDuplicate = schedules.some(existingSchedule => {
      // Skip the current schedule if we're editing
      if (id && existingSchedule.id === id) {
        return false;
      }
      
      // Check if time matches
      if (existingSchedule.time !== scheduleTime) {
        return false;
      }
      
      // Check if any days overlap
      const hasOverlappingDays = selectedDays.some(day => 
        existingSchedule.days.includes(day)
      );
      
      return hasOverlappingDays;
    });
    
    if (isDuplicate) {
      const overlappingDays = selectedDays.filter(day => 
        schedules.some(existingSchedule => 
          existingSchedule.time === scheduleTime && 
          existingSchedule.days.includes(day) &&
          (!id || existingSchedule.id !== id)
        )
      );
      
      setValidationError(
        `A schedule already exists for ${scheduleTime} on ${overlappingDays.join(', ')}. Please choose a different time or days.`
      );
      return;
    }
    
    setValidationError('');
    
    const scheduleData = {
      title,
      time: `${time} ${period}`,
      days: selectedDays,
      active: true,
      notificationMinutes,
    };

    if (id) {
      updateSchedule(id, scheduleData);
      router.back();
    } else {
      const success = addSchedule(scheduleData);
      if (success) {
        router.back();
      }
      // If not successful, the validation error will already be set above
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
        <Text style={styles.headerTitle}>
          {id ? 'Edit Schedule' : 'Set Up Schedule'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {validationError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#ff6b6b" />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Schedule Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Morning Inspection"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Schedule Time</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeInputContainer}>
              <Clock size={18} color="#8BA840" style={styles.inputIcon} />
              <TextInput
                style={styles.timeInput}
                value={time}
                onChangeText={setTime}
                placeholder="08:00"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'AM' && styles.periodButtonActive
                ]}
                onPress={() => setPeriod('AM')}
              >
                <Text style={[
                  styles.periodText,
                  period === 'AM' && styles.periodTextActive
                ]}>AM</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'PM' && styles.periodButtonActive
                ]}
                onPress={() => setPeriod('PM')}
              >
                <Text style={[
                  styles.periodText,
                  period === 'PM' && styles.periodTextActive
                ]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Repeat On</Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day) && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[
                  styles.dayText,
                  selectedDays.includes(day) && styles.dayTextActive
                ]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Notification</Text>
          <View style={styles.notificationOptions}>
            {NOTIFICATION_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.notificationOption,
                  notificationMinutes === option.id && styles.notificationOptionActive
                ]}
                onPress={() => setNotificationMinutes(option.id)}
              >
                <Text style={[
                  styles.notificationOptionText,
                  notificationMinutes === option.id && styles.notificationOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>
            {id ? 'Update Schedule' : 'Save Schedule'}
          </Text>
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
    padding: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ff6b6b',
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Poppins-Regular',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    marginRight: 8,
  },
  timeInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  periodSelector: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  periodButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  periodButtonActive: {
    backgroundColor: '#8BA840',
    borderColor: '#8BA840',
  },
  periodText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  periodTextActive: {
    color: 'white',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  dayButtonActive: {
    backgroundColor: '#8BA840',
    borderColor: '#8BA840',
  },
  dayText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
  },
  dayTextActive: {
    color: 'white',
  },
  notificationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  notificationOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  notificationOptionActive: {
    backgroundColor: '#8BA840',
    borderColor: '#8BA840',
  },
  notificationOptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
  },
  notificationOptionTextActive: {
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#8BA840',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#8BA840',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#8BA840',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  },
});