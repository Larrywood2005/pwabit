import Notification from '../models/Notification.js';
import { io } from '../server.js';

export const notificationService = {
  // Create and broadcast notification
  async createNotification(userId, type, title, message, relatedUserId = null, amount = 0, currency = 'USD') {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        relatedUserId,
        amount,
        currency
      });

      await notification.save();
      console.log('[v0] Notification created:', {
        userId,
        type,
        title,
        _id: notification._id
      });

      // Broadcast to user via Socket.io
      if (io) {
        io.to(`user_${userId}`).emit('notification', {
          _id: notification._id,
          type,
          title,
          message,
          amount,
          currency,
          createdAt: notification.createdAt,
          isRead: false
        });
      }

      return notification;
    } catch (error) {
      console.error('[v0] Error creating notification:', error);
      throw error;
    }
  },

  // Notify when user receives funds from another user
  async notifyFollowerFundsReceived(userId, senderName, amount, currency, senderId) {
    try {
      const title = `Received ${currency}!`;
      const message = `${senderName} sent you ${amount} ${currency}`;
      
      await this.createNotification(
        userId,
        currency === 'USD' ? 'received_usd_from_user' : 'received_powaup_from_user',
        title,
        message,
        senderId,
        amount,
        currency
      );
    } catch (error) {
      console.error('[v0] Error notifying funds received:', error);
    }
  },

  // Notify when admin grants funds
  async notifyAdminGrant(userId, amount, currency) {
    try {
      const title = `Admin Bonus: ${currency}`;
      const message = `You received ${amount} ${currency} from admin`;
      
      await this.createNotification(
        userId,
        currency === 'USD' ? 'received_usd_from_admin' : 'received_powaup_from_admin',
        title,
        message,
        null,
        amount,
        currency
      );
    } catch (error) {
      console.error('[v0] Error notifying admin grant:', error);
    }
  },

  // Mark single notification as read
  async markAsRead(notificationId) {
    try {
      return await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('[v0] Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, updatedAt: new Date() }
      );
    } catch (error) {
      console.error('[v0] Error marking all as read:', error);
      throw error;
    }
  },

  // Get paginated notifications for user
  async getUserNotifications(userId, skip = 0, limit = 50) {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Notification.countDocuments({ userId });

      return {
        notifications,
        total,
        hasMore: skip + limit < total
      };
    } catch (error) {
      console.error('[v0] Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread count
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ userId, isRead: false });
    } catch (error) {
      console.error('[v0] Error getting unread count:', error);
      return 0;
    }
  },

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      return await Notification.findByIdAndDelete(notificationId);
    } catch (error) {
      console.error('[v0] Error deleting notification:', error);
      throw error;
    }
  },

  // Cleanup old notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      console.log('[v0] Cleaned up', result.deletedCount, 'old notifications');
      return result;
    } catch (error) {
      console.error('[v0] Error cleaning up notifications:', error);
    }
  }
};

export default notificationService;
