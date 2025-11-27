// ============================================
// Analytics Types
// ============================================

export interface EnergyDataPoint {
  timestamp: string | Date;
  consumption: number; // in kWh
  cost: number; // in currency
  deviceId?: string;
  deviceName?: string;
  day?: number;
  hour?: number;
}

export interface AnalyticsSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  totalPowerConsumption: number; // in Watts
  averageHealthScore: number;
  totalSwitches: number;
  switchesOn: number;
  switchesOff: number;
}

export interface DeviceAnalytics {
  deviceId: string;
  deviceName: string;
  classroom: string;
  totalUptime: number; // in seconds
  totalDowntime: number; // in seconds
  totalConsumption: number; // in kWh
  totalCost: number;
  avgPower: number; // in Watts
  switchStats: SwitchStatistics[];
}

export interface SwitchStatistics {
  switchId: string;
  switchName: string;
  totalOnTime: number; // in seconds
  totalOffTime: number; // in seconds
  toggleCount: number;
  avgPowerConsumption: number; // in Watts
}

export interface UptimeData {
  deviceId: string;
  deviceName: string;
  onlineDuration: number; // in seconds
  offlineDuration: number; // in seconds
  uptimePercentage: number;
  lastOnline: Date | string;
  lastOffline: Date | string;
}

export interface EnergyCalendarDay {
  day: number;
  consumption: number; // in kWh
  cost: number;
  hasData: boolean;
}

export interface EnergyCalendarMonth {
  year: number;
  month: number;
  days: EnergyCalendarDay[];
  totalConsumption: number;
  totalCost: number;
}

export interface ForecastData {
  timestamp: string | Date;
  predicted: number;
  actual?: number;
  confidence?: number;
}

export interface AnomalyData {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'power_spike' | 'connectivity_loss' | 'temperature_anomaly' | 'usage_anomaly';
  severity: number; // 1-10
  timestamp: Date | string;
  description: string;
  resolved: boolean;
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: string | Date;
  [key: string]: string | number | Date;
}
