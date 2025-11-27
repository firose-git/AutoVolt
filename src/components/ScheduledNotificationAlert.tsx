import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, X, Bell, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import socketService from '@/services/socket';

interface DeviceNotificationData {
  deviceId: string;
  deviceName: string;
  classroom?: string;
  location?: string;
  message: string;
  notificationTime: string;
  timestamp: Date;
  activeSwitches: Array<{ id: string; name: string }>;
  totalSwitches: number;
}

interface DeviceNotificationAlertProps {
  className?: string;
}

export const DeviceNotificationAlert: React.FC<DeviceNotificationAlertProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<DeviceNotificationData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const handleDeviceNotification = (data: Partial<DeviceNotificationData>) => {
      // Defensive normalization: ensure arrays and timestamps exist
      const normalized: DeviceNotificationData = {
        deviceId: data.deviceId || 'unknown',
        deviceName: data.deviceName || 'Unknown Device',
        classroom: data.classroom,
        location: data.location,
        message: data.message || 'No message',
        notificationTime: data.notificationTime || new Date().toLocaleTimeString(),
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        activeSwitches: Array.isArray(data.activeSwitches) ? data.activeSwitches : [],
        totalSwitches: typeof data.totalSwitches === 'number' ? data.totalSwitches : (Array.isArray(data.activeSwitches) ? data.activeSwitches.length : 0)
      };
      console.log('Device notification received (normalized):', normalized);

      // Deduplicate: ignore if we already have the same deviceId + timestamp + message
      setNotifications(prev => {
        const exists = prev.some(n => n.deviceId === normalized.deviceId && (n.timestamp?.getTime?.() ?? new Date(n.timestamp).getTime()) === (normalized.timestamp?.getTime?.() ?? new Date(normalized.timestamp).getTime()) && n.message === normalized.message);
        if (exists) return prev;
        return [normalized, ...prev].slice(0, 10); // Keep only the 10 most recent notifications
      });

      // Show toast notification
      toast({
        title: 'Device Alert',
        description: data.message,
        duration: 10000, // Show for 10 seconds
      });
    };

    socketService.onDeviceNotification(handleDeviceNotification);

    return () => {
      socketService.off('device_notification', handleDeviceNotification);
    };
  }, [toast]);

  const dismissNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Device Alerts</span>
          <Badge variant="destructive" className="text-xs">
            {notifications.length}
          </Badge>
        </div>
        {notifications.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllNotifications}
            className="text-xs h-6 px-2"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.map((notification, index) => (
          <Alert key={`${notification.deviceId}-${notification.timestamp}`} className="border-orange-200 bg-orange-50">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 flex items-center justify-between">
              <span className="text-sm">
                {notification.deviceName} - Time Alert
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(index)}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Bell className="w-3 h-3" />
                  <span><strong>Alert:</strong> {notification.message}</span>
                </div>
                <div><strong>Time Threshold:</strong> {notification.notificationTime}</div>
                {notification.classroom && (
                  <div><strong>Classroom:</strong> {notification.classroom}</div>
                )}
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  <span><strong>Active Switches:</strong> {notification.activeSwitches?.length ?? 0}/{notification.totalSwitches ?? 0}</span>
                </div>
                {notification.activeSwitches && notification.activeSwitches.length > 0 && notification.activeSwitches.length < 3 && (
                  <div><strong>Switches ON:</strong> {notification.activeSwitches.map(sw => sw.name).join(', ')}</div>
                )}
                <div className="text-xs opacity-75">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
};

export default DeviceNotificationAlert;