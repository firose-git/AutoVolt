import { PresenceUser, usePresence } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Users, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Props for PresenceIndicator component
 */
interface PresenceIndicatorProps {
  /**
   * Room/channel to show presence for
   */
  room?: string;
  
  /**
   * Maximum number of avatars to show
   */
  maxAvatars?: number;
  
  /**
   * Show online count badge
   */
  showCount?: boolean;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PresenceIndicator Component
 * Shows who's currently online with avatars and status
 */
export function PresenceIndicator({
  room,
  maxAvatars = 5,
  showCount = true,
  size = 'md',
}: PresenceIndicatorProps) {
  const { users, onlineCount } = usePresence({ room });

  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const visibleUsers = users.slice(0, maxAvatars);
  const remainingCount = Math.max(0, users.length - maxAvatars);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* User Avatars */}
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className={`${sizes[size]} border-2 border-background ring-2 ring-background`}>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status Indicator */}
                  <span
                    className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-background ${
                      statusColors[user.status]
                    }`}
                    aria-label={user.status}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{user.name}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  <p className="text-xs">
                    <span className="capitalize">{user.status}</span>
                    {user.lastSeen && (
                      <> • {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}</>
                    )}
                  </p>
                  {user.currentPage && (
                    <p className="text-xs text-muted-foreground">On: {user.currentPage}</p>
                  )}
                  {user.customStatus && (
                    <p className="text-xs italic">&quot;{user.customStatus}&quot;</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Remaining Count */}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${sizes[size]} flex items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium`}
                >
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Online Count Badge */}
        {showCount && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span>{onlineCount} online</span>
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * UserPresenceStatus Component
 * Shows single user's presence status
 */
interface UserPresenceStatusProps {
  user: PresenceUser;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export function UserPresenceStatus({
  user,
  size = 'md',
  showDetails = false,
}: UserPresenceStatusProps) {
  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusColors = {
    online: 'text-green-500',
    away: 'text-yellow-500',
    busy: 'text-red-500',
    offline: 'text-gray-400',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline',
  };

  return (
    <div className="flex items-center gap-2">
      <Circle
        className={`${sizes[size]} fill-current ${statusColors[user.status]}`}
        aria-hidden="true"
      />
      {showDetails && (
        <div className="flex flex-col">
          <span className="text-sm font-medium capitalize">{statusLabels[user.status]}</span>
          {user.lastSeen && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PresenceList Component
 * Shows full list of online users
 */
interface PresenceListProps {
  room?: string;
  showOffline?: boolean;
}

export function PresenceList({ room, showOffline = false }: PresenceListProps) {
  const { users, getUsersByStatus } = usePresence({ room });

  const onlineUsers = getUsersByStatus('online');
  const awayUsers = getUsersByStatus('away');
  const busyUsers = getUsersByStatus('busy');
  const offlineUsers = showOffline ? getUsersByStatus('offline') : [];

  const UserSection = ({ title, users }: { title: string; users: PresenceUser[] }) => {
    if (users.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <div className="space-y-1">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {user.currentPage && (
                  <p className="text-xs text-muted-foreground truncate">On: {user.currentPage}</p>
                )}
                {user.customStatus && (
                  <p className="text-xs italic text-muted-foreground truncate">
                    &quot;{user.customStatus}&quot;
                  </p>
                )}
              </div>
              <UserPresenceStatus user={user} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <UserSection title="Online" users={onlineUsers} />
      <UserSection title="Away" users={awayUsers} />
      <UserSection title="Busy" users={busyUsers} />
      {showOffline && <UserSection title="Offline" users={offlineUsers} />}
      
      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No users online</p>
        </div>
      )}
    </div>
  );
}
