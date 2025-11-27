// ============================================
// Device Types
// ============================================

export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance';
export type DeviceType = 'esp32' | 'esp8266' | 'arduino';
export type SwitchType = 'relay' | 'light' | 'fan' | 'outlet' | 'projector' | 'ac';
export type ManualMode = 'maintained' | 'momentary';

export interface Switch {
  _id?: string;
  id?: string;
  name: string;
  gpio?: number;
  relayGpio: number;
  type: SwitchType;
  state: boolean;
  icon?: string;
  manualSwitchEnabled?: boolean;
  manualSwitchGpio?: number;
  manualMode?: ManualMode;
  manualActiveLow?: boolean;
  usePir?: boolean;
  dontAutoOff?: boolean;
  power?: number;
  maxPower?: number;
  minPower?: number;
}

export interface Device {
  _id: string;
  name: string;
  macAddress: string;
  classroom: string;
  building?: string;
  floor?: string;
  room?: string;
  type: DeviceType;
  status: DeviceStatus;
  switches: Switch[];
  lastSeen: Date | string;
  isOnline: boolean;
  secret?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  ipAddress?: string;
  signalStrength?: number;
  uptime?: number;
  freeHeap?: number;
  temperature?: number;
  notes?: string;
  tags?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  // PIR/Motion Sensor Configuration
  pirEnabled?: boolean;
  pirGpio?: number;
  pirAutoOffDelay?: number;
  // Dual Sensor Configuration
  pirSensorType?: 'hc-sr501' | 'rcwl-0516' | 'both';
  pirSensitivity?: number;
  pirDetectionRange?: number;
  motionDetectionLogic?: 'and' | 'or' | 'weighted';
  // Notification Settings
  notificationSettings?: {
    afterTime?: string;
    daysOfWeek?: number[];
    enabled?: boolean;
    lastTriggered?: Date | string;
  };
  // Device Type (for backward compatibility)
  deviceType?: DeviceType;
}

export interface DeviceUpdate {
  name?: string;
  classroom?: string;
  building?: string;
  floor?: string;
  room?: string;
  type?: DeviceType;
  switches?: Partial<Switch>[];
  notes?: string;
  tags?: string[];
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  totalSwitches: number;
  switchesOn: number;
  switchesOff: number;
}
