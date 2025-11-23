import { useEffect, useState, useCallback } from 'react';
import { scheduleMonitoringService, ScheduleEvent, Schedule } from '@/services/ScheduleMonitoringService';
import { useMQTT } from './useMQTT';

export function useScheduleMonitoring(schedules: Schedule[]) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastEvent, setLastEvent] = useState<ScheduleEvent | null>(null);
  const [nextScheduledEvent, setNextScheduledEvent] = useState<{
    schedule: Schedule;
    nextRun: Date;
  } | null>(null);

  const { sendSprayCommand, isConnected } = useMQTT();

  const handleScheduleEvent = useCallback((event: ScheduleEvent) => {
    console.log('Schedule event triggered:', event);
    setLastEvent(event);
  }, []);

  const startMonitoring = useCallback(() => {
    if (!isConnected) {
      console.warn('Cannot start schedule monitoring: MQTT not connected');
      return false;
    }

    try {
      scheduleMonitoringService.addEventCallback(handleScheduleEvent);
      scheduleMonitoringService.startMonitoring(schedules, sendSprayCommand);
      setIsMonitoring(true);
      console.log('Schedule monitoring started');
      return true;
    } catch (error) {
      console.error('Failed to start schedule monitoring:', error);
      return false;
    }
  }, [schedules, sendSprayCommand, isConnected, handleScheduleEvent]);

  const stopMonitoring = useCallback(() => {
    try {
      scheduleMonitoringService.removeEventCallback(handleScheduleEvent);
      scheduleMonitoringService.stopMonitoring();
      setIsMonitoring(false);
      console.log('Schedule monitoring stopped');
    } catch (error) {
      console.error('Failed to stop schedule monitoring:', error);
    }
  }, [handleScheduleEvent]);

  // Update next scheduled event when schedules change
  useEffect(() => {
    const nextEvent = scheduleMonitoringService.getNextScheduledEvent(schedules);
    setNextScheduledEvent(nextEvent);
  }, [schedules]);

  // Auto-start monitoring when connected and schedules are available
  useEffect(() => {
    if (isConnected && schedules.length > 0 && !isMonitoring) {
      const activeSchedules = schedules.filter(s => s.active);
      if (activeSchedules.length > 0) {
        startMonitoring();
      }
    }
  }, [isConnected, schedules, isMonitoring, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring, stopMonitoring]);

  return {
    isMonitoring,
    lastEvent,
    nextScheduledEvent,
    startMonitoring,
    stopMonitoring,
    canStartMonitoring: isConnected && schedules.some(s => s.active)
  };
}