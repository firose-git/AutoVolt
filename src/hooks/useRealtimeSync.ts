import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '@/services/socket';

/**
 * Real-time sync status
 */
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

/**
 * Sync event
 */
interface SyncEvent<T = any> {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id: string;
  data?: T;
  timestamp: number;
  userId?: string;
}

/**
 * Optimistic update
 */
interface OptimisticUpdate<T = any> {
  id: string;
  event: SyncEvent<T>;
  rollback: () => void;
  timestamp: number;
}

/**
 * Hook options
 */
interface UseRealtimeSyncOptions {
  /**
   * Collection/resource to sync
   */
  collection: string;
  
  /**
   * Enable optimistic updates
   */
  optimistic?: boolean;
  
  /**
   * Retry failed syncs
   */
  retry?: boolean;
  
  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
  
  /**
   * Conflict resolution strategy
   */
  conflictResolution?: 'server-wins' | 'client-wins' | 'manual';
}

/**
 * Hook for real-time data synchronization
 * Handles optimistic updates, conflict resolution, and offline queue
 */
export function useRealtimeSync<T = any>(options: UseRealtimeSyncOptions) {
  const {
    collection,
    optimistic = true,
    retry = true,
    maxRetries = 3,
    conflictResolution = 'server-wins',
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingUpdates, setPendingUpdates] = useState<SyncEvent<T>[]>([]);
  const [conflicts, setConflicts] = useState<SyncEvent<T>[]>([]);
  
  const optimisticUpdates = useRef<Map<string, OptimisticUpdate<T>>>(new Map());
  const retryAttempts = useRef<Map<string, number>>(new Map());

  // Create event
  const create = useCallback(async (data: T, rollback?: () => void): Promise<void> => {
    const event: SyncEvent<T> = {
      type: 'create',
      collection,
      id: `temp-${Date.now()}`,
      data,
      timestamp: Date.now(),
    };

    if (optimistic && rollback) {
      // Apply optimistic update
      const updateId = `opt-${Date.now()}`;
      optimisticUpdates.current.set(updateId, {
        id: updateId,
        event,
        rollback,
        timestamp: Date.now(),
      });
      setSyncStatus('syncing');
    }

    try {
      // Emit to server
      socketService.emit('sync:create', event);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      
      if (optimistic && rollback) {
        rollback();
        optimisticUpdates.current.delete(`opt-${Date.now()}`);
      }

      if (retry) {
        setPendingUpdates((prev) => [...prev, event]);
      }

      throw error;
    }
  }, [collection, optimistic, retry]);

  // Update event
  const update = useCallback(async (id: string, data: Partial<T>, rollback?: () => void): Promise<void> => {
    const event: SyncEvent<T> = {
      type: 'update',
      collection,
      id,
      data: data as T,
      timestamp: Date.now(),
    };

    if (optimistic && rollback) {
      const updateId = `opt-${Date.now()}`;
      optimisticUpdates.current.set(updateId, {
        id: updateId,
        event,
        rollback,
        timestamp: Date.now(),
      });
      setSyncStatus('syncing');
    }

    try {
      socketService.emit('sync:update', event);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      
      if (optimistic && rollback) {
        rollback();
        optimisticUpdates.current.delete(`opt-${Date.now()}`);
      }

      if (retry) {
        setPendingUpdates((prev) => [...prev, event]);
      }

      throw error;
    }
  }, [collection, optimistic, retry]);

  // Delete event
  const remove = useCallback(async (id: string, rollback?: () => void): Promise<void> => {
    const event: SyncEvent<T> = {
      type: 'delete',
      collection,
      id,
      timestamp: Date.now(),
    };

    if (optimistic && rollback) {
      const updateId = `opt-${Date.now()}`;
      optimisticUpdates.current.set(updateId, {
        id: updateId,
        event,
        rollback,
        timestamp: Date.now(),
      });
      setSyncStatus('syncing');
    }

    try {
      socketService.emit('sync:delete', event);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      
      if (optimistic && rollback) {
        rollback();
        optimisticUpdates.current.delete(`opt-${Date.now()}`);
      }

      if (retry) {
        setPendingUpdates((prev) => [...prev, event]);
      }

      throw error;
    }
  }, [collection, optimistic, retry]);

  // Retry pending updates
  const retryPending = useCallback(async () => {
    const pending = [...pendingUpdates];
    setPendingUpdates([]);

    for (const event of pending) {
      const attempts = retryAttempts.current.get(event.id) || 0;
      
      if (attempts >= maxRetries) {
        console.error(`Max retries exceeded for ${event.id}`);
        continue;
      }

      try {
        socketService.emit(`sync:${event.type}`, event);
        retryAttempts.current.delete(event.id);
      } catch (error) {
        retryAttempts.current.set(event.id, attempts + 1);
        setPendingUpdates((prev) => [...prev, event]);
      }
    }
  }, [pendingUpdates, maxRetries]);

  // Handle incoming sync events
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent<T>) => {
      if (event.collection !== collection) return;

      // Check for conflicts with optimistic updates
      const hasOptimistic = Array.from(optimisticUpdates.current.values()).some(
        (update) => update.event.id === event.id
      );

      if (hasOptimistic && conflictResolution === 'manual') {
        setConflicts((prev) => [...prev, event]);
      } else if (hasOptimistic && conflictResolution === 'server-wins') {
        // Server wins, rollback optimistic
        optimisticUpdates.current.forEach((update) => {
          if (update.event.id === event.id) {
            update.rollback();
            optimisticUpdates.current.delete(update.id);
          }
        });
      }
      // client-wins: do nothing, keep optimistic update
    };

    socketService.on('sync:create', handleSyncEvent);
    socketService.on('sync:update', handleSyncEvent);
    socketService.on('sync:delete', handleSyncEvent);

    return () => {
      socketService.off('sync:create', handleSyncEvent);
      socketService.off('sync:update', handleSyncEvent);
      socketService.off('sync:delete', handleSyncEvent);
    };
  }, [collection, conflictResolution]);

  // Auto-retry on reconnection
  useEffect(() => {
    const handleReconnect = () => {
      if (pendingUpdates.length > 0) {
        retryPending();
      }
    };

    socketService.on('connect', handleReconnect);

    return () => {
      socketService.off('connect', handleReconnect);
    };
  }, [pendingUpdates, retryPending]);

  // Resolve conflict
  const resolveConflict = useCallback((eventId: string, resolution: 'accept' | 'reject') => {
    const conflict = conflicts.find((c) => c.id === eventId);
    if (!conflict) return;

    if (resolution === 'accept') {
      // Accept server version, rollback optimistic
      optimisticUpdates.current.forEach((update) => {
        if (update.event.id === eventId) {
          update.rollback();
          optimisticUpdates.current.delete(update.id);
        }
      });
    }

    setConflicts((prev) => prev.filter((c) => c.id !== eventId));
  }, [conflicts]);

  // Clear all optimistic updates
  const clearOptimistic = useCallback(() => {
    optimisticUpdates.current.forEach((update) => update.rollback());
    optimisticUpdates.current.clear();
  }, []);

  return {
    // State
    syncStatus,
    pendingUpdates: pendingUpdates.length,
    conflicts: conflicts.length,
    conflictList: conflicts,

    // Actions
    create,
    update,
    remove,
    retryPending,
    resolveConflict,
    clearOptimistic,
  };
}
