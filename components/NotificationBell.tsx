'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  description?: string;
  relatedUserName?: string;
  relatedUserCode?: string;
  amount?: number;
  currency?: string;
  actionUrl?: string;
  actionType?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const socket = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.io connection and fetch notifications
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        setLoading(true);

        // Connect to Socket.io
        socket.current = io(window.location.origin, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling']
        });

        // Listen for real-time notifications
        socket.current.on('notification', (newNotification: Notification) => {
          console.log('[v0] Real-time notification received:', newNotification);
          
          // Add to beginning of notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          
          // Show visual notification (optional browser notification)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/icon-notification.png'
            });
          }
        });

        // Listen for multiple notifications
        socket.current.on('notifications:batch', (batch: Notification[]) => {
          console.log('[v0] Batch notifications received:', batch.length);
          setNotifications(prev => [...batch, ...prev]);
        });

        // Fetch initial notifications
        const response = await apiClient.getNotifications(1, 50);
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);

        setLoading(false);
      } catch (error) {
        console.error('[v0] Error setting up notifications:', error);
        setLoading(false);
      }
    };

    setupNotifications();

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[v0] Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[v0] Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      
      const wasUnread = !notifications.find(n => n._id === notificationId)?.isRead;
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[v0] Failed to delete notification:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow_user_sent_powaup':
      case 'follow_user_sent_usd':
        return 'bg-green-500/10 border-green-500/20';
      case 'admin_granted_powaup':
      case 'admin_granted_usd':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'referral_commission':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'daily_bonus':
      case 'game_reward':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'withdrawal_completed':
        return 'bg-orange-500/10 border-orange-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_user_sent_powaup':
      case 'follow_user_sent_usd':
        return '📤';
      case 'admin_granted_powaup':
      case 'admin_granted_usd':
        return '🎁';
      case 'referral_commission':
        return '💰';
      case 'daily_bonus':
        return '📅';
      case 'game_reward':
        return '🎮';
      case 'withdrawal_completed':
        return '✅';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell size={20} className="text-foreground" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute top-12 right-0 w-96 max-h-96 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-border hover:bg-muted/50 transition-colors ${getNotificationColor(notification.type)} cursor-pointer`}
                >
                  {/* Notification Content */}
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="text-xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground break-words">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {notification.message}
                      </p>
                      {notification.description && (
                        <p className="text-xs text-muted-foreground mt-1 opacity-75">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id);
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification._id);
                        }}
                        className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/30 text-center">
              <button className="text-xs text-primary hover:underline font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
