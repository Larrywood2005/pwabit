import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

/**
 * Get user's notifications with pagination
 * GET /notifications?page=1&limit=50
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { page = 1, limit = 50 } = req.query;

    const result = await notificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  } catch (error) {
    console.error('[v0] Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

/**
 * Get unread notification count
 * GET /notifications/unread-count
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;

    const count = await notificationService.getUnreadCount(userId);

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('[v0] Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count', error: error.message });
  }
});

/**
 * Mark notification as read
 * POST /notifications/:notificationId/read
 */
router.post('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('[v0] Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

/**
 * Mark all notifications as read
 * POST /notifications/read-all
 */
router.post('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;

    const result = await notificationService.markAllAsRead(userId);

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('[v0] Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
});

/**
 * Delete notification
 * DELETE /notifications/:notificationId
 */
router.delete('/:notificationId', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { notificationId } = req.params;

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('[v0] Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
});

export default router;
