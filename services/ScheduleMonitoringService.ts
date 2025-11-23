import { SprayCommand } from './MQTTService';

export interface ScheduleEvent {
  scheduleId: string;
  title: string;
  timestamp: string;
  action: 'start' | 'stop';
}

export interface Schedule {
  id: string;
  title: string;
  time: string; // Format: "08:00 AM"
  days: string[]; // ['Mon', 'Tue', 'Wed', etc.]
  active: boolean;
}

class ScheduleMonitoringService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastCheckedMinute = -1;
  private eventCallbacks: ((event: ScheduleEvent) => void)[] = [];
  private sendCommandCallback: ((command: SprayCommand) => Promise<boolean>) | null = null;

  // Day mapping for schedule checking
  private readonly dayMap = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 
    'Thu': 4, 'Fri': 5, 'Sat': 6
  };

  startMonitoring(schedules: Schedule[], sendCommand: (command: SprayCommand) => Promise<boolean>): void {
    if (this.isMonitoring) {
      console.log('Schedule monitoring already active');
      return;
    }

    this.sendCommandCallback = sendCommand;
    this.isMonitoring = true;
    this.lastCheckedMinute = -1;

    console.log('Starting schedule monitoring...');

    // Check schedules every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSchedules(schedules);
    }, 30000);

    // Initial check
    this.checkSchedules(schedules);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('Stopping schedule monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.sendCommandCallback = null;
  }

  private checkSchedules(schedules: Schedule[]): void {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay();
    const currentDayName = Object.keys(this.dayMap).find(
      key => this.dayMap[key as keyof typeof this.dayMap] === currentDay
    );

    // Only check once per minute to avoid duplicate triggers
    if (currentMinute === this.lastCheckedMinute) {
      return;
    }

    this.lastCheckedMinute = currentMinute;

    console.log(`Checking schedules at ${now.toLocaleTimeString()}`);

    const activeSchedules = schedules.filter(schedule => schedule.active);

    for (const schedule of activeSchedules) {
      if (this.shouldTriggerSchedule(schedule, currentMinute, currentDayName)) {
        this.triggerSchedule(schedule);
      }
    }
  }

  private shouldTriggerSchedule(schedule: Schedule, currentMinute: number, currentDayName?: string): boolean {
    // Check if today is in the schedule's days
    if (!currentDayName || !schedule.days.includes(currentDayName)) {
      return false;
    }

    // Parse schedule time
    const scheduleMinute = this.parseTimeToMinutes(schedule.time);
    if (scheduleMinute === -1) {
      console.warn(`Invalid time format for schedule ${schedule.id}: ${schedule.time}`);
      return false;
    }

    // Check if current time matches schedule time (within 1 minute tolerance)
    return Math.abs(currentMinute - scheduleMinute) <= 1;
  }

  private parseTimeToMinutes(timeString: string): number {
    try {
      // Parse format like "08:00 AM" or "05:30 PM"
      const [time, period] = timeString.split(' ');
      const [hours, minutes] = time.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        return -1;
      }

      let totalMinutes = hours * 60 + minutes;

      // Convert to 24-hour format
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

  private async triggerSchedule(schedule: Schedule): Promise<void> {
    console.log(`Triggering schedule: ${schedule.title} at ${new Date().toLocaleTimeString()}`);

    const event: ScheduleEvent = {
      scheduleId: schedule.id,
      title: schedule.title,
      timestamp: new Date().toISOString(),
      action: 'start'
    };

    // Notify event callbacks
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in schedule event callback:', error);
      }
    });

    // Send MQTT command to start spraying
    if (this.sendCommandCallback) {
      try {
        const command: SprayCommand = {
          action: 'start',
          scheduleId: schedule.id,
          pestType: 'Scheduled Treatment'
        };

        const success = await this.sendCommandCallback(command);
        
        if (success) {
          console.log(`Successfully triggered schedule: ${schedule.title}`);
        } else {
          console.error(`Failed to trigger schedule: ${schedule.title}`);
        }
      } catch (error) {
        console.error(`Error triggering schedule ${schedule.title}:`, error);
      }
    }
  }

  addEventCallback(callback: (event: ScheduleEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  removeEventCallback(callback: (event: ScheduleEvent) => void): void {
    this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
  }

  isActive(): boolean {
    return this.isMonitoring;
  }

  getNextScheduledEvent(schedules: Schedule[]): { schedule: Schedule; nextRun: Date } | null {
    const now = new Date();
    const activeSchedules = schedules.filter(schedule => schedule.active);
    
    let nextEvent: { schedule: Schedule; nextRun: Date } | null = null;
    let earliestTime = Infinity;

    for (const schedule of activeSchedules) {
      const nextRun = this.calculateNextRun(schedule, now);
      if (nextRun && nextRun.getTime() < earliestTime) {
        earliestTime = nextRun.getTime();
        nextEvent = { schedule, nextRun };
      }
    }

    return nextEvent;
  }

  private calculateNextRun(schedule: Schedule, fromDate: Date): Date | null {
    const scheduleMinutes = this.parseTimeToMinutes(schedule.time);
    if (scheduleMinutes === -1) return null;

    const scheduleHours = Math.floor(scheduleMinutes / 60);
    const scheduleMinutesRemainder = scheduleMinutes % 60;

    // Check each day in the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      const dayName = Object.keys(this.dayMap).find(
        key => this.dayMap[key as keyof typeof this.dayMap] === checkDate.getDay()
      );

      if (dayName && schedule.days.includes(dayName)) {
        const scheduledTime = new Date(checkDate);
        scheduledTime.setHours(scheduleHours, scheduleMinutesRemainder, 0, 0);

        // If it's today, make sure the time hasn't passed
        if (dayOffset === 0 && scheduledTime <= fromDate) {
          continue;
        }

        return scheduledTime;
      }
    }

    return null;
  }
}

export const scheduleMonitoringService = new ScheduleMonitoringService();