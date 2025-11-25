import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

export interface DebugLog {
  id: string;
  message: string;
  level: 'log' | 'warn' | 'error' | 'info';
  timestamp: string;
}

const MAX_LOGS = 50;

export function useDebugConsole(enabled: boolean = true) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const originalConsole = useRef({
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  });

  const addLog = useCallback((message: string, level: 'log' | 'warn' | 'error' | 'info' = 'log') => {
    if (!enabled || Platform.OS === 'web') return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const newLog: DebugLog = {
      id: `${Date.now()}-${Math.random()}`,
      message: String(message),
      level,
      timestamp,
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev];
      return updated.length > MAX_LOGS ? updated.slice(0, MAX_LOGS) : updated;
    });
  }, [enabled]);

  // Override console methods
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    console.log = (...args) => {
      originalConsole.current.log(...args);
      addLog(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '), 'log');
    };

    console.warn = (...args) => {
      originalConsole.current.warn(...args);
      addLog(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '), 'warn');
    };

    console.error = (...args) => {
      originalConsole.current.error(...args);
      addLog(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '), 'error');
    };

    console.info = (...args) => {
      originalConsole.current.info(...args);
      addLog(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '), 'info');
    };

    return () => {
      console.log = originalConsole.current.log;
      console.warn = originalConsole.current.warn;
      console.error = originalConsole.current.error;
      console.info = originalConsole.current.info;
    };
  }, [enabled, addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, clearLogs, addLog };
}