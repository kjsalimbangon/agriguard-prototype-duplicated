import { Platform } from 'react-native';
import mqtt, { MqttClient } from 'mqtt';

// MQTT client interface for cross-platform compatibility
export interface MQTTClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, callback: (message: string) => void): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  isConnected(): boolean;
}

// Base MQTT client with shared logic
abstract class BaseMQTTClient implements MQTTClient {
  protected client: MqttClient | null = null;
  protected connected = false;
  protected subscriptions = new Map<string, (message: string) => void>();

  abstract connect(): Promise<void>;

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.end(true); // Force close
      this.client = null;
    }
    this.connected = false;
    this.subscriptions.clear();
  }

  async publish(topic: string, message: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, message, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async subscribe(topic: string, callback: (message: string) => void): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    this.subscriptions.set(topic, callback);

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    this.subscriptions.delete(topic);

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  protected setupMessageHandler(): void {
    if (!this.client) return;

    this.client.on('message', (topic: string, payload: Buffer) => {
      const callback = this.subscriptions.get(topic);
      if (callback) {
        callback(payload.toString());
      }
    });
  }
}

// Web MQTT client implementation
class WebMQTTClient extends BaseMQTTClient {
  async connect(): Promise<void> {
    if (Platform.OS !== 'web') {
      throw new Error('WebMQTTClient should only be used on web');
    }

    if (this.connected || this.client) {
      return;
    }

    const options = {
      clientId: `agriguard_web_${Math.random().toString(16).substring(2, 10)}`,
      username: 'roche',
      password: 'roche@54321',
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
    };

    return new Promise((resolve, reject) => {
      const client = mqtt.connect('wss://mqtt-racknerd.imbento.online:9001', options);

      client.on('connect', () => {
        console.log('✅ MQTT connected (web)');
        this.client = client;
        this.connected = true;
        this.setupMessageHandler();
        resolve();
      });

      client.on('error', (error) => {
        console.error('❌ MQTT connection error (web):', error);
        reject(error);
      });

      // Optional: handle reconnect, close, etc.
    });
  }
}

// Native MQTT client implementation (for iOS/Android)
class NativeMQTTClient extends BaseMQTTClient {
  async connect(): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('NativeMQTTClient should not be used on web');
    }

    if (this.connected || this.client) {
      return;
    }

    // Note: On React Native, you typically use the same 'mqtt' package,
    // but ensure your bundler supports it (e.g., with polyfills for Buffer, etc.)
    const options = {
      clientId: `agriguard_native_${Math.random().toString(16).substring(2, 10)}`,
      username: 'roche',
      password: 'roche@54321',
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      // For React Native, sometimes you need to specify protocol explicitly
      protocol: 'wss',
    };

    return new Promise((resolve, reject) => {
      const client = mqtt.connect('wss://mqtt-racknerd.imbento.online:9001', options);

      client.on('connect', () => {
        console.log('✅ MQTT connected (native)');
        this.client = client;
        this.connected = true;
        this.setupMessageHandler();
        resolve();
      });

      client.on('error', (error) => {
        console.error('❌ MQTT connection error (native):', error);
        reject(error);
      });
    });
  }
}

// Device command interfaces
export interface SprayCommand {
  action: 'start' | 'stop';
  duration?: number; // in seconds
  intensity?: number; // 1-10 scale
  pestType?: string;
  scheduleId?: string;
}

export interface DeviceStatus {
  deviceId: string;
  online: boolean;
  batteryLevel?: number;
  waterLevel?: number;
  lastActivity: string;
  currentAction?: 'idle' | 'spraying' | 'error';
}

// Main MQTT service class
class MQTTService {
  private client: MQTTClient;
  private deviceId: string;
  private statusCallbacks: ((status: DeviceStatus) => void)[] = [];
  private deviceStatus: DeviceStatus;
  private timeoutTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Choose the appropriate client based on platform
    this.client = Platform.OS === 'web' ? new WebMQTTClient() : new NativeMQTTClient();
    this.deviceId = this.generateDeviceId();

    this.deviceStatus = {
      deviceId: this.deviceId,
      online: false,
      lastActivity: new Date().toISOString(),
      currentAction: 'idle',
    };
  }

  private generateDeviceId(): string {
    return `agriguard_${Math.random().toString(36).substring(2, 11)}`;
  }

  private autoOffTimer: NodeJS.Timeout | null = null;
  private isScheduledSpray: boolean = false; // Optional: to distinguish manual vs scheduled

  private resetTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    this.timeoutTimer = setTimeout(() => {
      console.log('⚠️ Device timeout: marking offline');
      this.updateDeviceStatus({ online: false, currentAction: 'error' });
    }, 5000);
  }

  private updateDeviceStatus(updates: Partial<DeviceStatus>): void {
    this.deviceStatus = {
      ...this.deviceStatus,
      ...updates,
      lastActivity: new Date().toISOString(),
    };

    this.statusCallbacks.forEach((callback) => {
      try {
        callback(this.deviceStatus);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect();

      await this.client.subscribe('/esp32/sprinkler/status', (message) => {
        this.handleStatusUpdate(message);
      });

      this.resetTimeout();
      console.log('MQTT Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MQTT service:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    this.updateDeviceStatus({ online: false });

    try {
      await this.client.unsubscribe('/esp32/sprinkler/status');
      await this.client.disconnect();
      console.log('MQTT Service disconnected');
    } catch (error) {
      console.error('Error during MQTT disconnect:', error);
    }
  }

  async sendSprayCommand(command: SprayCommand, isScheduled: boolean = false): Promise<void> {
  if (!this.client.isConnected()) {
    throw new Error('MQTT client not connected');
  }

  const topic = '/esp32/sprinkler/cmd';
  const message = command.action === 'start' ? '1' : '0';

  try {
    await this.client.publish(topic, message);
    console.log(`📡 Spray command sent: ${command.action} (${message})`);

    // Update local status
    this.updateDeviceStatus({
      currentAction: command.action === 'start' ? 'spraying' : 'idle',
    });

    // If this is a scheduled START command, set auto-off timer
    if (isScheduled && command.action === 'start') {
      this.isScheduledSpray = true;

      // Clear any existing timer
      if (this.autoOffTimer) {
        clearTimeout(this.autoOffTimer);
      }

      // Set new 30-second auto-off
      this.autoOffTimer = setTimeout(async () => {
        console.log('⏰ Auto-off timer triggered: turning sprinkler OFF');
        try {
          await this.client.publish('/esp32/sprinkler/cmd', '0');
          this.updateDeviceStatus({ currentAction: 'idle' });
        } catch (err) {
          console.error('Failed to auto-turn off sprinkler:', err);
        } finally {
          this.autoOffTimer = null;
          this.isScheduledSpray = false;
        }
      }, 30_000); // 30 seconds
    }

    // If user manually turns OFF, cancel auto-off
    if (command.action === 'stop') {
      if (this.autoOffTimer) {
        clearTimeout(this.autoOffTimer);
        this.autoOffTimer = null;
      }
      this.isScheduledSpray = false;
    }
  } catch (error) {
    console.error('Failed to send spray command:', error);
    throw error;
  }
}
  async triggerScheduledSpray(): Promise<void> {
  await this.sendSprayCommand({ action: 'start' }, true); // `true` = isScheduled
}
  async sendScheduleUpdate(schedules: any[]): Promise<void> {
    console.log('📅 Schedule update (for future implementation):', schedules.length, 'schedules');
    // Future: publish to a schedule topic if ESP32 supports it
  }

  private handleStatusUpdate(message: string): void {
    const statusValue = message.trim();
    console.log('📊 Device status update:', statusValue);

    if (statusValue === '1') {
      this.updateDeviceStatus({ online: true, currentAction: 'idle' });
      this.resetTimeout();
    } else {
      this.updateDeviceStatus({ online: false, currentAction: 'error' });
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    }
  }

  addStatusCallback(callback: (status: DeviceStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  removeStatusCallback(callback: (status: DeviceStatus) => void): void {
    this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback);
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getDeviceStatus(): DeviceStatus {
    return { ...this.deviceStatus };
  }
}

export const mqttService = new MQTTService();