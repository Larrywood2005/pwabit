'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, CheckCheck } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Initialize socket connection
  useEffect(() => {
    try {
      const newSocket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('[v0] Socket connected for notifications');
      });

      newSocket.on('notification', (notification: Notification) => {
        console.log('[v0] New notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (error) {
      console.error('[v0] Socket connection error:', error);
    }
  }, []);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('[v0] Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[v0] Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[v0] Error marking all as read:', error);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('[v0] Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('usd') || type.includes('powaup')) {
      return '💰';
    }
    if (type.includes('referral')) {
      return '👥';
    }
    if (type.includes('bonus')) {
      return '🎁';
    }
    return '📢';
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('usd')) return 'bg-green-50 border-green-200';
    if (type.includes('powaup')) return 'bg-blue-50 border-blue-200';
    if (type.includes('admin')) return 'bg-purple-50 border-purple-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className='relative z-50' ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 sm:p-2.5 text-foreground hover:bg-muted rounded-lg transition-colors flex-shrink-0'
        aria-label='Notifications'
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className='absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className='absolute right-0 top-full mt-2 w-screen sm:w-96 max-h-96 sm:max-h-[500px] bg-card border border-border rounded-lg shadow-xl z-[9999] flex flex-col overflow-hidden' style={{ pointerEvents: 'auto' }}>
          {/* Header */}
          <div className='flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border bg-muted/50 flex-shrink-0'>
            <h3 className='font-semibold text-foreground text-sm sm:text-base'>Notifications</h3>
            <div className='flex items-center gap-2'>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className='p-1 text-xs sm:text-sm text-primary hover:bg-primary/10 rounded transition-colors flex items-center gap-1'
                  title='Mark all as read'
                >
                  <CheckCheck size={16} />
                  <span className='hidden xs:inline'>All Read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className='p-1 text-muted-foreground hover:text-foreground transition-colors'
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className='flex-1 overflow-y-auto'>
            {loading ? (
              <div className='flex items-center justify-center h-32 sm:h-40 text-muted-foreground'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className='flex items-center justify-center h-32 sm:h-40 text-muted-foreground text-sm'>
                No notifications yet
              </div>
            ) : (
              <ul className='divide-y divide-border'>
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className={`p-3 sm:p-4 hover:bg-muted/50 transition-colors border-l-4 ${
                      notification.isRead ? 'bg-background border-l-transparent' : 'bg-primary/5 border-l-primary'
                    }`}
                  >
                    <div className='flex gap-2 sm:gap-3'>
                      {/* Icon */}
                      <div className='text-lg sm:text-xl flex-shrink-0 mt-0.5'>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex-1 min-w-0'>
                            <p className='font-semibold text-foreground text-sm sm:text-base line-clamp-1'>
                              {notification.title}
                            </p>
                            <p className='text-muted-foreground text-xs sm:text-sm line-clamp-2 mt-0.5'>
                              {notification.message}
                            </p>
                            {(notification.amount ?? 0) > 0 && (
                              <p className='text-primary font-semibold text-xs sm:text-sm mt-1'>
                                +{notification.amount} {notification.currency}
                              </p>
                            )}
                            <p className='text-muted-foreground text-xs mt-1'>
                              {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className='flex gap-1 flex-shrink-0'>
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification._id)}
                                className='p-1.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0'
                                title='Mark as read'
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification._id)}
                              className='p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0'
                              title='Delete'
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='text-center py-2 sm:py-3 border-t border-border text-xs sm:text-sm text-muted-foreground bg-muted/30 flex-shrink-0'>
              Notifications auto-delete after 30 days
            </div>
          )}
        </div>
      )}
    </div>
  );
}
