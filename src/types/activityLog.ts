// ============================================
// Activity Log Types
// ============================================

export type ActionType = 
  | 'on' 
  | 'off' 
  | 'toggle'
  | 'manual_on' 
  | 'manual_off' 
  | 'manual_toggle'
  | 'device_created' 
  | 'device_updated' 
  | 'device_deleted'
  | 'bulk_on' 
  | 'bulk_off'
  | 'status_check' 
  | 'heartbeat'
  | 'conflict_resolved';

export type TriggerSource = 
  | 'user' 
  | 'schedule' 
  | 'pir' 
  | 'master' 
  | 'system' 
  | 'manual_switch' 
  | 'monitoring';

export interface ConflictResolution {
  hasConflict: boolean;
  conflictType?: string;
  resolution?: string;
  responseTime?: number;
}

export interface DeviceStatusInfo {
  isOnline: boolean;
  responseTime?: number;
  signalStrength?: number;
}

export interface ActivityLog {
  _id: string;
  deviceId: string;
  deviceName?: string;
  switchId?: string;
  switchName?: string;
  action: ActionType;
  triggeredBy: TriggerSource;
  userId?: string;
  userName?: string;
  classroom?: string;
  location?: string;
  timestamp: Date | string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  powerConsumption?: number;
  conflictResolution?: ConflictResolution;
  deviceStatus?: DeviceStatusInfo;
  context?: Record<string, any>;
}

export interface ActivityLogFilter {
  deviceId?: string;
  userId?: string;
  action?: ActionType;
  triggeredBy?: TriggerSource;
  classroom?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  skip?: number;
}

export interface ActivityLogStats {
  totalLogs: number;
  byAction: Record<ActionType, number>;
  byTrigger: Record<TriggerSource, number>;
  byDevice: Record<string, number>;
  byUser: Record<string, number>;
}
