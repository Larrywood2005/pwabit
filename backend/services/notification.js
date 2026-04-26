import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

/**
 * Notification Service - Handle all notification operations
 * - Create notifications
 * - Send real-time notifications via Socket.io
 * - Mark as read
 * - Fetch notifications
 */

let io = null;

export const setNotificationIO = (ioInstance) => {
  io = ioInstance;
  console.log('[v0] Notification service initialized with Socket.io');
};

/**
 * Create a notification and send via Socket.io
 */
export const createNotification = async (userId, type, data) => {
  try {
    if (!userId || !type) {
      throw new Error('Missing userId or type');
    }

    const notification = new Notification({
      userId,
      type,
      title: data.title,
      message: data.message,
      description: data.description || null,
      relatedUserId: data.relatedUserId || null,
      relatedUserName: data.relatedUserName || null,
      relatedUserCode: data.relatedUserCode || null,
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      actionUrl: data.actionUrl || null,
      actionType: data.actionType || null,
      metadata: data.metadata || {}
    });

    await notification.save();

    console.log('[v0] Notification created:', {
      notificationId: notification._id.toString(),
      userId: userId.toString(),
      type,
      title: data.title
    });

    // Send real-time notification via Socket.io if connected
    if (io) {
      io.to(userId.toString()).emit('notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        description: notification.description,
        relatedUserName: notification.relatedUserName,
        relatedUserCode: notification.relatedUserCode,
        amount: notification.amount,
        currency: notification.currency,
        actionUrl: notification.actionUrl,
        actionType: notification.actionType,
        createdAt: notification.createdAt
      });

      console.log('[v0] Real-time notification sent via Socket.io to user:', userId.toString());
    }

    return notification;
  } catch (error) {
    console.error('[v0] Failed to create notification:', error.message);
    throw error;
  }
};

/**
 * Send notification to follower when follow user sends them funds
 */
export const notifyFollowerFundsReceived = async (recipientId, senderId, senderName, senderCode, amount, type) => {
  try {
    const currency = type === 'usd' ? 'USD' : 'PowaUp';
    const typeLabel = type === 'usd' ? 'USD' : 'PowaUp credits';

    await createNotification(recipientId, 'follow_user_sent_' + type, {
      title: `Received ${typeLabel} from ${senderName}`,
      message: `${senderName} sent you ${amount} ${typeLabel}`,
      description: `You received ${amount} ${typeLabel} from ${senderName} (${senderCode})`,
      relatedUserId: senderId,
      relatedUserName: senderName,
      relatedUserCode: senderCode,
      amount,
      currency,
      actionUrl: `/dashboard/transactions`,
      actionType: 'view_transaction'
    });
  } catch (error) {
    console.error('[v0] Failed to notify follower funds received:', error.message);
    // Don't throw - notification failure shouldn't block transaction
  }
};

/**
 * Send notification to user when admin grants them funds
 */
export const notifyAdminGrant = async (userId, amount, type, adminName = 'Admin') => {
  try {
    const currency = type === 'usd' ? 'USD' : 'PowaUp';
    const typeLabel = type === 'usd' ? 'USD' : 'PowaUp credits';

    await createNotification(userId, 'admin_granted_' + type, {
      title: `Received ${typeLabel} from ${adminName}`,
      message: `${adminName} granted you ${amount} ${typeLabel}`,
      description: `Your account has been credited with ${amount} ${typeLabel} by ${adminName}.`,
      amount,
      currency,
      actionUrl: `/dashboard/balance`,
      actionType: 'view_details'
    });
  } catch (error) {
    console.error('[v0] Failed to notify admin grant:', error.message);
    // Don't throw - notification failure shouldn't block grant
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );

    if (notification) {
      console.log('[v0] Notification marked as read:', notificationId.toString());
    }

    return notification;
  } catch (error) {
    console.error('[v0] Failed to mark notification as read:', error.message);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    console.log('[v0] Marked', result.modifiedCount, 'notifications as read for user:', userId.toString());
    return result;
  } catch (error) {
    console.error('[v0] Failed to mark all notifications as read:', error.message);
    throw error;
  }
};

/**
 * Get user notifications with pagination
 */
export const getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = false) => {
  try {
    const filter = { userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      unreadCount
    };
  } catch (error) {
    console.error('[v0] Failed to get user notifications:', error.message);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('[v0] Failed to get unread count:', error.message);
    return 0;
  }
};

/**
 * Delete old notifications (keep only last 30 days)
 */
export const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log('[v0] Cleaned up', result.deletedCount, 'old notifications');
    return result;
  } catch (error) {
    console.error('[v0] Failed to cleanup old notifications:', error.message);
    throw error;
  }
};

export default {
  createNotification,
  notifyFollowerFundsReceived,
  notifyAdminGrant,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
  getUnreadCount,
  cleanupOldNotifications,
  setNotificationIO
};
