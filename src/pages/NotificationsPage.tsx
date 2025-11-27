import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Filter, Search, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNotifications, Notification } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  // Filter notifications based on current filter and search
  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unread' && !notification.isRead) ||
      (filter === 'read' && notification.isRead);

    const matchesSearch =
      searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedNotifications) {
      await markAsRead(id);
    }
    setSelectedNotifications(new Set());
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n._id)));
    } else {
      setSelectedNotifications(new Set());
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'medium':
        return <Info className="w-5 h-5 text-primary" />;
      case 'low':
        return <Info className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-destructive bg-destructive/5';
      case 'high':
        return 'border-warning bg-warning/5';
      case 'medium':
        return 'border-primary bg-primary/5';
      case 'low':
        return 'border-muted-foreground bg-muted/5';
      default:
        return 'border-muted-foreground bg-muted/5';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;

    return new Date(date).toLocaleDateString();
  };

  const getFilterCounts = () => {
    const unread = notifications.filter(n => !n.isRead).length;
    const read = notifications.filter(n => n.isRead).length;
    return { all: notifications.length, unread, read };
  };

  const counts = getFilterCounts();

  useEffect(() => {
    // Fetch all notifications when component mounts
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-muted-foreground" />
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-sm px-2 py-1 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {selectedNotifications.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedNotifications.size} selected
                  </span>
                  <button
                    onClick={handleMarkSelectedAsRead}
                    className="flex items-center space-x-2 px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark as Read</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters and Search */}
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filter:</span>
                </div>
                <div className="flex space-x-2">
                  {[
                    { key: 'all', label: 'All', count: counts.all },
                    { key: 'unread', label: 'Unread', count: counts.unread },
                    { key: 'read', label: 'Read', count: counts.read }
                  ].map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={cn(
                        'px-3 py-1 text-sm rounded-full transition-colors',
                        filter === key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent w-64 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-destructive">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-16 text-center">
                <Bell className="w-16 h-16 mx-auto text-muted opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Try adjusting your search or filters'
                    : 'You\'ll see notifications here when they arrive'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                <div className="px-6 py-3 bg-muted/10 border-b border-border">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Select all ({filteredNotifications.length})
                    </span>
                  </label>
                </div>

                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={cn(
                      'p-6 hover:bg-accent transition-colors',
                      getPriorityColor(notification.priority),
                      !notification.isRead && 'border-l-4 border-primary'
                    )}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification._id)}
                        onChange={(e) => handleSelectNotification(notification._id, e.target.checked)}
                        className="mt-1 rounded border-input text-primary focus:ring-ring"
                      />

                      <div className="flex-shrink-0">
                        {getPriorityIcon(notification.priority)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={cn(
                            'text-lg font-medium text-foreground',
                            !notification.isRead && 'font-semibold'
                          )}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10"
                                title="Mark as read"
                              >
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-muted-foreground mt-2 leading-relaxed">
                          {notification.message}
                        </p>

                        {notification.metadata && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            <span className="font-medium">Type:</span> {notification.type}
                            {notification.metadata.deviceName && (
                              <> • <span className="font-medium">Device:</span> {notification.metadata.deviceName}</>
                            )}
                            {notification.metadata.classroom && (
                              <> • <span className="font-medium">Classroom:</span> {notification.metadata.classroom}</>
                            )}
                          </div>
                        )}

                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (action.url) {
                                    window.location.href = action.url;
                                  }
                                  // Handle other actions here
                                }}
                                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded hover:bg-primary/20 transition-colors"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;