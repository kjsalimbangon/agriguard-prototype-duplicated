import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface ScheduleNotification {
  scheduleId: string;
  title: string;
  body: string;
  trigger: Date;
  notificationId?: string;
}

class NotificationService {
  private scheduledNotifications = new Map<string, string>(); // scheduleId -> notificationId
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web platform');
        this.isInitialized = true;
        return false;
      }

      // Request permissions first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        this.isInitialized = true;
        return false;
      }

      // Create notification channel for Android 8.0+
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      this.isInitialized = true; // Mark as initialized to prevent repeated attempts
      return false;
    }
  }

  private async createNotificationChannel(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'AgriGuard Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8BA840',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to create notification channel:', error);
    }
  }

  async scheduleNotification(notification: ScheduleNotification): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        console.warn('Notification service not initialized');
        return null;
      }

      if (Platform.OS === 'web') {
        console.log('Mock notification scheduled:', notification);
        return 'mock-notification-id';
      }

      // Cancel existing notification for this schedule if any
      await this.cancelScheduleNotification(notification.scheduleId);

      // Ensure trigger time is in the future
      if (notification.trigger <= new Date()) {
        console.warn('Cannot schedule notification in the past');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'default',
        },
        trigger: notification.trigger,
      });

      // Store the notification ID for this schedule
      this.scheduledNotifications.set(notification.scheduleId, notificationId);

      console.log(`Notification scheduled for schedule ${notification.scheduleId}:`, notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelScheduleNotification(scheduleId: string): Promise<void> {
    try {
      const notificationId = this.scheduledNotifications.get(scheduleId);
      if (notificationId) {
        if (Platform.OS !== 'web') {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        this.scheduledNotifications.delete(scheduleId);
        console.log(`Cancelled notification for schedule ${scheduleId}`);
      }
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllScheduleNotifications(): Promise<void> {
    try {
      const scheduleIds = Array.from(this.scheduledNotifications.keys());
      await Promise.all(
        scheduleIds.map(scheduleId => this.cancelScheduleNotification(scheduleId))
      );
      console.log('Cancelled all schedule notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async updateScheduleNotifications(schedules: any[]): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.warn('Notification service not initialized, skipping update');
        return;
      }

      // Cancel all existing notifications
      await this.cancelAllScheduleNotifications();

      // Schedule new notifications for active schedules
      const activeSchedules = schedules.filter(schedule => schedule.active);
      
      for (const schedule of activeSchedules) {
        try {
          const nextRun = this.calculateNextRun(schedule);
          if (nextRun) {
            const notificationMinutes = parseInt(schedule.notificationMinutes || '15');
            const notificationTime = new Date(nextRun.getTime() - (notificationMinutes * 60 * 1000));
            
            // Only schedule if notification time is in the future
            if (notificationTime > new Date()) {
              await this.scheduleNotification({
                scheduleId: schedule.id,
                title: 'AgriGuard Schedule Reminder',
                body: `"${schedule.title}" will start in ${notificationMinutes} minutes`,
                trigger: notificationTime,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to schedule notification for schedule ${schedule.id}:`, error);
          // Continue with other schedules even if one fails
        }
      }
    } catch (error) {
      console.error('Failed to update schedule notifications:', error);
    }
  }

  private calculateNextRun(schedule: any): Date | null {
    try {
      const now = new Date();
      const scheduleMinutes = this.parseTimeToMinutes(schedule.time);
      if (scheduleMinutes === -1) return null;

      const scheduleHours = Math.floor(scheduleMinutes / 60);
      const scheduleMinutesRemainder = scheduleMinutes % 60;

      const dayMap = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 
        'Thu': 4, 'Fri': 5, 'Sat': 6
      };

      // Check each day in the next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        
        const dayName = Object.keys(dayMap).find(
          key => dayMap[key as keyof typeof dayMap] === checkDate.getDay()
        );

        if (dayName && schedule.days.includes(dayName)) {
          const scheduledTime = new Date(checkDate);
          scheduledTime.setHours(scheduleHours, scheduleMinutesRemainder, 0, 0);

          // If it's today, make sure the time hasn't passed
          if (dayOffset === 0 && scheduledTime <= now) {
            continue;
          }

          return scheduledTime;
        }
      }

      return null;
    } catch (error) {
      console.error('Error calculating next run:', error);
      return null;
    }
  }

  private parseTimeToMinutes(timeString: string): number {
    try {
      const [time, period] = timeString.split(' ');
      const [hours, minutes] = time.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        return -1;
      }

      let totalMinutes = hours * 60 + minutes;

      if (period === 'PM' && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period === 'AM' && hours === 12) {
        totalMinutes -= 12 * 60;
      }

      return totalMinutes;
    } catch (error) {
      console.error('Error parsing time:', error);
      return -1;
    }
  }

  getScheduledNotifications(): Map<string, string> {
    return new Map(this.scheduledNotifications);
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export const notificationService = new NotificationService();