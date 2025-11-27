import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuth } from './AuthContext';

export interface Notification {
  _id: string;
  recipient: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  relatedEntity?: {
    model: string;
    id: string;
  };
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
    data?: any;
  }>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (params?: { limit?: number; unreadOnly?: boolean }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();

  // Fetch notifications
  const fetchNotifications = async (params?: { limit?: number; unreadOnly?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.getNotifications(params);
      if (response.data?.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await authAPI.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Mark all unread notifications as read locally
      const unreadNotifications = notifications.filter(n => !n.isRead);
      for (const notification of unreadNotifications) {
        await authAPI.markNotificationAsRead(notification._id);
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  };

  // Refresh unread count
  const refreshUnreadCount = async () => {
    try {
      const response = await authAPI.getUnreadNotificationCount();
      if (response.data?.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Add new notification (for real-time updates)
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Set up real-time notifications via Socket.IO
  useEffect(() => {
    if (!socketService) return;

    const handleNotification = (data: Notification) => {
      console.log('Received real-time notification:', data);
      addNotification(data);
    };

    const handleUserNotification = (data: Notification) => {
      console.log('Received user-specific notification:', data);
      addNotification(data);
    };

    // Listen for various notification events
    socketService.on('notification', handleNotification);
    socketService.on('user_notification', handleUserNotification);
    socketService.on('device_notification', handleNotification);
    socketService.on('system_notification', handleNotification);

    return () => {
      socketService.off('notification', handleNotification);
      socketService.off('user_notification', handleUserNotification);
      socketService.off('device_notification', handleNotification);
      socketService.off('system_notification', handleNotification);
    };
  }, [socketService]);

  // Initial load - only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications({ limit: 20 });
      refreshUnreadCount();
    }
  }, [isAuthenticated]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshUnreadCount,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};