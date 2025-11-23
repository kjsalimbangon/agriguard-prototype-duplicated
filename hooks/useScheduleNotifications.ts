import { useEffect } from 'react';
import { notificationService } from '@/services/NotificationService';
import { Schedule } from '@/context/ScheduleContext';

export function useScheduleNotifications(schedules: Schedule[]) {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const initialized = await notificationService.initialize();
        if (initialized && schedules.length > 0) {
          await notificationService.updateScheduleNotifications(schedules);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    // Only initialize if not already initialized
    if (!notificationService.isServiceInitialized()) {
      initializeNotifications();
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Update notifications whenever schedules change
    const updateNotifications = async () => {
      try {
        if (notificationService.isServiceInitialized()) {
          await notificationService.updateScheduleNotifications(schedules);
        }
      } catch (error) {
        console.error('Error updating notifications:', error);
      }
    };

    updateNotifications();
  }, [schedules]);

  return {
    updateNotifications: async () => {
      try {
        await notificationService.updateScheduleNotifications(schedules);
      } catch (error) {
        console.error('Error updating notifications:', error);
      }
    },
    cancelAllNotifications: async () => {
      try {
        await notificationService.cancelAllScheduleNotifications();
      } catch (error) {
        console.error('Error cancelling notifications:', error);
      }
    },
  };
}