// ============================================
// Common API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
  details?: any;
  timestamp: string;
}

// ============================================
// Schedule Types
// ============================================

export type ScheduleType = 'weekly' | 'custom' | 'one-time';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface Schedule {
  _id: string;
  name: string;
  type: ScheduleType;
  deviceId: string;
  deviceName?: string;
  switchId?: string;
  switchName?: string;
  days?: DayOfWeek[];
  startDate?: Date | string;
  endDate?: Date | string;
  timeSlots: TimeSlot[];
  isActive: boolean;
  createdBy: string;
  classroom?: string;
  description?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ScheduleCreate {
  name: string;
  type: ScheduleType;
  deviceId: string;
  switchId?: string;
  days?: DayOfWeek[];
  startDate?: Date | string;
  endDate?: Date | string;
  timeSlots: TimeSlot[];
  isActive?: boolean;
  classroom?: string;
  description?: string;
}

// ============================================
// Ticket Types
// ============================================

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 
  | 'device_issue' 
  | 'switch_malfunction' 
  | 'connectivity' 
  | 'power' 
  | 'maintenance' 
  | 'feature_request' 
  | 'other';

export interface TicketComment {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  mentions?: string[];
  attachments?: string[];
  createdAt: Date | string;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  deviceId?: string;
  deviceName?: string;
  classroom?: string;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  comments: TicketComment[];
  attachments?: string[];
  resolvedAt?: Date | string;
  closedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TicketCreate {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  deviceId?: string;
  classroom?: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
}

// ============================================
// Master Switch Types
// ============================================

export interface MasterSwitch {
  _id: string;
  name: string;
  description?: string;
  devices: string[];
  switches?: string[];
  classroom?: string;
  building?: string;
  floor?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MasterSwitchCreate {
  name: string;
  description?: string;
  devices: string[];
  switches?: string[];
  classroom?: string;
  building?: string;
  floor?: string;
}

// ============================================
// Settings Types
// ============================================

export interface SystemSettings {
  powerRate: number; // Cost per kWh
  currency: string;
  timezone: string;
  autoOffDelay: number; // in minutes
  maintenanceMode: boolean;
  maxSwitchesPerDevice: number;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  enableAIML: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  emailNotifications: boolean;
  dashboardLayout: string;
  defaultView: string;
}

// ============================================
// Socket/Real-time Types
// ============================================

export interface SocketMessage<T = any> {
  event: string;
  data: T;
  timestamp: string;
}

export interface DeviceStateChange {
  deviceId: string;
  switches: Array<{
    id: string;
    state: boolean;
  }>;
  source: 'user' | 'schedule' | 'system';
  timestamp: string;
}
