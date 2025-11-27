import { SyncStatus, useRealtimeSync } from '@/hooks/useRealtimeSync';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  WifiOff,
} from 'lucide-react';

/**
 * Sync Status Indicator Props
 */
interface SyncStatusIndicatorProps {
  /**
   * Current sync status
   */
  status: SyncStatus;
  
  /**
   * Number of pending updates
   */
  pendingCount?: number;
  
  /**
   * Number of conflicts
   */
  conflictCount?: number;
  
  /**
   * Retry callback
   */
  onRetry?: () => void;
  
  /**
   * Show detailed status
   */
  showDetails?: boolean;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Sync Status Indicator Component
 * Shows real-time synchronization status
 */
export function SyncStatusIndicator({
  status,
  pendingCount = 0,
  conflictCount = 0,
  onRetry,
  showDetails = false,
  size = 'md',
}: SyncStatusIndicatorProps) {
  const statusConfig: Record<SyncStatus, {
    icon: any;
    label: string;
    color: string;
    bgColor: string;
    variant: 'success' | 'default' | 'warning' | 'destructive';
    animate?: string;
  }> = {
    synced: {
      icon: CheckCircle2,
      label: 'Synced',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      variant: 'success',
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      variant: 'default',
      animate: 'animate-spin',
    },
    offline: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      variant: 'warning',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      variant: 'destructive',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Icon
                className={`${sizes[size]} ${config.color} ${config.animate || ''}`}
                aria-hidden="true"
              />
              {size !== 'sm' && (
                <span className="text-sm font-medium">{config.label}</span>
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              {pendingCount > 0 && (
                <p className="text-xs">{pendingCount} pending updates</p>
              )}
              {conflictCount > 0 && (
                <p className="text-xs text-yellow-500">{conflictCount} conflicts</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon
          className={`${sizes[size]} ${config.color} ${config.animate || ''}`}
          aria-hidden="true"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{config.label}</p>
        <div className="flex items-center gap-2 mt-1">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
          {conflictCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {conflictCount} conflicts
            </Badge>
          )}
        </div>
      </div>
      
      {(status === 'error' || status === 'offline') && onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Connection Status Banner
 * Shows prominent banner when offline
 */
interface ConnectionStatusBannerProps {
  isOnline: boolean;
  onRetry?: () => void;
}

export function ConnectionStatusBanner({
  isOnline,
  onRetry,
}: ConnectionStatusBannerProps) {
  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <CloudOff className="h-5 w-5" aria-hidden="true" />
        <div>
          <p className="font-medium">You're offline</p>
          <p className="text-sm">Changes will be saved when connection is restored</p>
        </div>
      </div>
      
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="bg-yellow-950 text-yellow-50 hover:bg-yellow-900"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Sync Status Bar
 * Compact status bar for bottom of screen
 */
interface SyncStatusBarProps {
  status: SyncStatus;
  pendingCount?: number;
  lastSyncTime?: Date;
  onRetry?: () => void;
}

export function SyncStatusBar({
  status,
  pendingCount = 0,
  lastSyncTime,
  onRetry,
}: SyncStatusBarProps) {
  const statusConfig: Record<SyncStatus, {
    icon: any;
    text: string;
    color: string;
    animate?: string;
  }> = {
    synced: {
      icon: Cloud,
      text: 'All changes saved',
      color: 'text-green-600',
    },
    syncing: {
      icon: Loader2,
      text: 'Saving changes...',
      color: 'text-blue-600',
      animate: 'animate-spin',
    },
    offline: {
      icon: CloudOff,
      text: 'Offline - changes will sync when online',
      color: 'text-yellow-600',
    },
    error: {
      icon: AlertCircle,
      text: 'Failed to sync',
      color: 'text-red-600',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-background border rounded-lg shadow-lg">
      <Icon className={`h-4 w-4 ${config.color} ${config.animate || ''}`} aria-hidden="true" />
      
      <span className="text-sm">{config.text}</span>
      
      {pendingCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {pendingCount}
        </Badge>
      )}
      
      {status === 'error' && onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2 text-xs">
          Retry
        </Button>
      )}
      
      {status === 'synced' && lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          • Just now
        </span>
      )}
    </div>
  );
}
