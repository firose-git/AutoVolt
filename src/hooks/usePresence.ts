import { useState, useEffect, useCallback } from 'react';
import socketService from '@/services/socket';

/**
 * User presence information
 */
export interface PresenceUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentPage?: string;
  customStatus?: string;
}

/**
 * Presence hook options
 */
interface UsePresenceOptions {
  /**
   * Room/channel to track presence in
   */
  room?: string;
  
  /**
   * Update interval for heartbeat (ms)
   */
  updateInterval?: number;
  
  /**
   * Auto-detect away status after inactivity (ms)
   */
  awayTimeout?: number;
}

/**
 * Hook for real-time user presence
 * Tracks who's online, their status, and current location
 */
export function usePresence(options: UsePresenceOptions = {}) {
  const {
    room = 'global',
    updateInterval = 30000, // 30 seconds
    awayTimeout = 300000, // 5 minutes
  } = options;

  const [users, setUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Update user presence
  const updatePresence = useCallback((updates: Partial<PresenceUser>) => {
    if (!currentUser) return;

    const updatedUser: PresenceUser = {
      ...currentUser,
      ...updates,
      lastSeen: new Date(),
    };

    setCurrentUser(updatedUser);

    // Emit to server
    socketService.emit('presence:update', {
      room,
      user: updatedUser,
    });
  }, [currentUser, room]);

  // Set user status
  const setStatus = useCallback((status: PresenceUser['status']) => {
    updatePresence({ status });
  }, [updatePresence]);

  // Set custom status message
  const setCustomStatus = useCallback((customStatus: string) => {
    updatePresence({ customStatus });
  }, [updatePresence]);

  // Set current page
  const setCurrentPage = useCallback((page: string) => {
    updatePresence({ currentPage: page });
  }, [updatePresence]);

  // Join presence room
  const joinRoom = useCallback((userId: string, userName: string, userEmail?: string) => {
    const user: PresenceUser = {
      id: userId,
      name: userName,
      email: userEmail,
      status: 'online',
      lastSeen: new Date(),
    };

    setCurrentUser(user);
    setIsTracking(true);

    // Join room on server
    socketService.emit('presence:join', {
      room,
      user,
    });
  }, [room]);

  // Leave presence room
  const leaveRoom = useCallback(() => {
    if (!currentUser) return;

    socketService.emit('presence:leave', {
      room,
      userId: currentUser.id,
    });

    setIsTracking(false);
    setCurrentUser(null);
  }, [room, currentUser]);

  // Handle presence updates from server
  useEffect(() => {
    if (!isTracking) return;

    const handleUserJoined = (data: { user: PresenceUser }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        next.set(data.user.id, data.user);
        return next;
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleUserUpdated = (data: { user: PresenceUser }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        next.set(data.user.id, data.user);
        return next;
      });
    };

    const handlePresenceList = (data: { users: PresenceUser[] }) => {
      const usersMap = new Map<string, PresenceUser>();
      data.users.forEach((user) => {
        usersMap.set(user.id, user);
      });
      setUsers(usersMap);
    };

    socketService.on('presence:user-joined', handleUserJoined);
    socketService.on('presence:user-left', handleUserLeft);
    socketService.on('presence:user-updated', handleUserUpdated);
    socketService.on('presence:list', handlePresenceList);

    // Request current presence list
    socketService.emit('presence:get-list', { room });

    return () => {
      socketService.off('presence:user-joined', handleUserJoined);
      socketService.off('presence:user-left', handleUserLeft);
      socketService.off('presence:user-updated', handleUserUpdated);
      socketService.off('presence:list', handlePresenceList);
    };
  }, [isTracking, room]);

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!isTracking || !currentUser) return;

    const interval = setInterval(() => {
      updatePresence({});
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isTracking, currentUser, updateInterval, updatePresence]);

  // Auto-detect away status
  useEffect(() => {
    if (!isTracking || !currentUser) return;

    let lastActivity = Date.now();
    let awayTimer: NodeJS.Timeout;

    const resetAwayTimer = () => {
      lastActivity = Date.now();
      
      if (currentUser.status === 'away') {
        setStatus('online');
      }

      clearTimeout(awayTimer);
      awayTimer = setTimeout(() => {
        if (currentUser.status === 'online') {
          setStatus('away');
        }
      }, awayTimeout);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetAwayTimer);
    });

    // Initial timer
    resetAwayTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetAwayTimer);
      });
      clearTimeout(awayTimer);
    };
  }, [isTracking, currentUser, awayTimeout, setStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        leaveRoom();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get online users count
  const onlineCount = Array.from(users.values()).filter(
    (user) => user.status === 'online' || user.status === 'away'
  ).length;

  // Get users by status
  const getUsersByStatus = (status: PresenceUser['status']) => {
    return Array.from(users.values()).filter((user) => user.status === status);
  };

  // Get users on same page
  const getUsersOnPage = (page: string) => {
    return Array.from(users.values()).filter((user) => user.currentPage === page);
  };

  return {
    // State
    users: Array.from(users.values()),
    currentUser,
    isTracking,
    onlineCount,

    // Actions
    joinRoom,
    leaveRoom,
    setStatus,
    setCustomStatus,
    setCurrentPage,
    updatePresence,

    // Queries
    getUsersByStatus,
    getUsersOnPage,
  };
}

/**
 * Hook for simple online/offline presence
 */
export function useOnlinePresence(userId?: string, userName?: string) {
  const presence = usePresence();

  useEffect(() => {
    if (userId && userName) {
      presence.joinRoom(userId, userName);
    }

    return () => {
      if (presence.isTracking) {
        presence.leaveRoom();
      }
    };
  }, [userId, userName]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    onlineCount: presence.onlineCount,
    users: presence.users,
  };
}
