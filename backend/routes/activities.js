import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createDailySpin,
  createDailyGame,
  createLoginBonus,
  getUserActivities,
  getTodayActivities
} from '../services/activityService.js';
import Activity from '../models/Activity.js';

const router = express.Router();

// Daily spin
router.post('/spin', authenticate, async (req, res) => {
  try {
    const result = await createDailySpin(req.user.userId);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Spin failed', error: error.message });
  }
});

// Daily game
router.post('/game', authenticate, async (req, res) => {
  try {
    const result = await createDailyGame(req.user.userId);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Game failed', error: error.message });
  }
});

// Login bonus
router.post('/login-bonus', authenticate, async (req, res) => {
  try {
    const result = await createLoginBonus(req.user.userId);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Bonus failed', error: error.message });
  }
});

// Get all activities (with pagination support)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const activities = await getUserActivities(req.user.userId);
    
    // Apply pagination
    const total = activities.length;
    const paginatedActivities = activities.slice(skip, skip + limit);
    
    res.json({
      data: paginatedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activities', error: error.message });
  }
});

// Get today's activities
router.get('/today', authenticate, async (req, res) => {
  try {
    const activities = await getTodayActivities(req.user.userId);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch today activities', error: error.message });
  }
});

export default router;
