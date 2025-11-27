// ============================================
// User Types
// ============================================

export type UserRole = 
  | 'super-admin' 
  | 'dean' 
  | 'hod' 
  | 'admin' 
  | 'faculty' 
  | 'teacher' 
  | 'student' 
  | 'security' 
  | 'guest';

export type AccessLevel = 'full' | 'limited' | 'readonly';

export interface UserPermissions {
  canManageAdmins: boolean;
  canManageUsers: boolean;
  canConfigureDevices: boolean;
  canControlDevices: boolean;
  canViewAllReports: boolean;
  canViewAssignedReports: boolean;
  canApproveRequests: boolean;
  canScheduleAutomation: boolean;
  canRequestDeviceControl: boolean;
  canMonitorSecurity: boolean;
  canViewPublicDashboard: boolean;
  canApproveExtensions: boolean;
  canRequestExtensions: boolean;
  emergencyOverride: boolean;
}

export interface ClassroomPermissions {
  canAccessAllClassrooms: boolean;
  departmentOverride: boolean;
  emergencyAccess: boolean;
  bypassTimeRestrictions: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  securityAlerts: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLevel: number;
  permissions: UserPermissions;
  department?: string;
  class?: string;
  employeeId?: string;
  phone?: string;
  designation?: string;
  accessLevel: AccessLevel;
  assignedDevices?: string[];
  assignedRooms?: string[];
  classroomPermissions: ClassroomPermissions;
  isActive: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date | string;
  lastLogin: Date | string;
  canRequestExtensions: boolean;
  canApproveExtensions: boolean;
  notificationPreferences: NotificationPreferences;
  registrationReason?: string;
  registrationDate: Date | string;
  lastProfileUpdate?: Date | string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  department?: string;
  class?: string;
  employeeId?: string;
  phone?: string;
  designation?: string;
  registrationReason?: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  class?: string;
  employeeId?: string;
  phone?: string;
  designation?: string;
  isActive?: boolean;
  isApproved?: boolean;
  assignedDevices?: string[];
  assignedRooms?: string[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends UserCreate {
  confirmPassword: string;
}
