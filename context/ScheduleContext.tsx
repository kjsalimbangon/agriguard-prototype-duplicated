import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Schedule {
  id: string;
  title: string;
  time: string;
  days: string[];
  active: boolean;
  notificationMinutes?: string;
}

interface ScheduleContextType {
  schedules: Schedule[];
  addSchedule: (schedule: Omit<Schedule, 'id'>) => boolean;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const addSchedule = (newSchedule: Omit<Schedule, 'id'>) => {
    // Double-check for duplicates at context level
    const isDuplicate = schedules.some(existingSchedule => {
      if (existingSchedule.time !== newSchedule.time) {
        return false;
      }
      
      const hasOverlappingDays = newSchedule.days.some(day => 
        existingSchedule.days.includes(day)
      );
      
      return hasOverlappingDays;
    });
    
    if (isDuplicate) {
      console.warn('Attempted to add duplicate schedule:', newSchedule);
      return false;
    }
    
    const schedule = {
      ...newSchedule,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updatedSchedules = [...schedules, schedule];
    setSchedules(updatedSchedules);
    
    console.log('Schedule added:', schedule);
    return true;
  };

  const updateSchedule = (id: string, updatedSchedule: Partial<Schedule>) => {
    const updatedSchedules = schedules.map((schedule) =>
        schedule.id === id ? { ...schedule, ...updatedSchedule } : schedule
    );
    setSchedules(updatedSchedules);
    
    console.log('Schedule updated:', id);
  };

  const deleteSchedule = (id: string) => {
    const updatedSchedules = schedules.filter((schedule) => schedule.id !== id);
    setSchedules(updatedSchedules);
    
    console.log('Schedule deleted:', id);
  };

  const toggleSchedule = (id: string) => {
    const updatedSchedules = schedules.map((schedule) =>
        schedule.id === id ? { ...schedule, active: !schedule.active } : schedule
    );
    setSchedules(updatedSchedules);
    
    console.log('Schedule toggled:', id);
  };

  return (
    <ScheduleContext.Provider
      value={{ schedules, addSchedule, updateSchedule, deleteSchedule, toggleSchedule }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}