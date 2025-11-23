import { useState, useEffect, useCallback } from 'react';
import { mqttService, SprayCommand, DeviceStatus } from '@/services/MQTTService';

export function useMQTT() {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleStatusUpdate = useCallback((status: DeviceStatus) => {
    setDeviceStatus(status);
  }, []);

  // Initialize device status from service
  useEffect(() => {
    setDeviceStatus(mqttService.getDeviceStatus());
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeMQTT = async () => {
      try {
        await mqttService.initialize();
        if (mounted) {
          setIsConnected(true);
          setConnectionError(null);
          mqttService.addStatusCallback(handleStatusUpdate);
        }
      } catch (error) {
        if (mounted) {
          setConnectionError(error instanceof Error ? error.message : 'Connection failed');
          setIsConnected(false);
        }
      }
    };

    initializeMQTT();

    return () => {
      mounted = false;
      mqttService.removeStatusCallback(handleStatusUpdate);
      mqttService.disconnect();
    };
  }, [handleStatusUpdate]);

  const sendSprayCommand = useCallback(async (command: SprayCommand) => {
    try {
      await mqttService.sendSprayCommand(command);
      return true;
    } catch (error) {
      console.error('Failed to send spray command:', error);
      return false;
    }
  }, []);

  const sendScheduleUpdate = useCallback(async (schedules: any[]) => {
    try {
      await mqttService.sendScheduleUpdate(schedules);
      return true;
    } catch (error) {
      console.error('Failed to send schedule update:', error);
      return false;
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await mqttService.disconnect();
      await mqttService.initialize();
      setIsConnected(true);
      setConnectionError(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Reconnection failed');
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    deviceStatus,
    connectionError,
    deviceId: mqttService.getDeviceId(),
    sendSprayCommand,
    sendScheduleUpdate,
    reconnect
  };
}