import express from 'express';
import { authenticate } from '../middleware/auth.js';
import GameReward from '../models/GameReward.js';
import User from '../models/User.js';

const router = express.Router();

// Claim daily login reward
router.post('/claim-daily-login', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[v0] User ID extraction failed from token:', JSON.stringify(req.user));
      return res.status(400).json({ message: 'User ID not found in token', debug: 'Invalid or missing user ID in JWT' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already claimed today
    const existingReward = await GameReward.findOne({
      userId,
      rewardType: 'daily-login',
      rewardDate: { $gte: today }
    });

    if (existingReward) {
      return res.status(400).json({
        message: 'You have already claimed your daily login reward today',
        nextClaimTime: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      });
    }

    // Create reward - $0.03 per day (0.03 cents = $0.03)
    const rewardAmount = 0.03;
    const reward = new GameReward({
      userId,
      rewardType: 'daily-login',
      amount: rewardAmount,
      description: 'Daily login bonus'
    });
    await reward.save();

    // Update user balance - add to currentBalance for real account earnings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { currentBalance: rewardAmount } },
      { new: true }
    );

    res.json({
      message: 'Daily login reward claimed successfully',
      reward: {
        amount: rewardAmount,
        type: 'daily-login',
        newBalance: updatedUser?.currentBalance || 0
      }
    });
  } catch (error) {
    console.error('[v0] Daily login claim error:', error);
    res.status(500).json({ message: 'Failed to claim reward' });
  }
});

// Claim puzzle win reward (once per day, $0.03)
router.post('/claim-puzzle-win', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[v0] User ID extraction failed from token:', JSON.stringify(req.user));
      return res.status(400).json({ message: 'User ID not found in token', debug: 'Invalid or missing user ID in JWT' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Check if user already won today
    const existingReward = await GameReward.findOne({
      userId,
      rewardType: 'puzzle-win',
      rewardDate: { $gte: today, $lt: tomorrow }
    });

    if (existingReward) {
      return res.status(400).json({
        message: 'You can only claim the puzzle reward once per day. Come back tomorrow!',
        nextClaimTime: tomorrow
      });
    }

    // Create reward - $0.03 per puzzle game win
    const rewardAmount = 0.03;
    const reward = new GameReward({
      userId,
      rewardType: 'puzzle-win',
      amount: rewardAmount,
      description: 'Puzzle game reward'
    });
    await reward.save();

    // Update user balance - add to currentBalance for real account earnings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { currentBalance: rewardAmount } },
      { new: true }
    );

    res.json({
      message: 'Puzzle reward claimed successfully',
      reward: {
        amount: rewardAmount,
        type: 'puzzle-win',
        newBalance: updatedUser?.currentBalance || 0
      }
    });
  } catch (error) {
    console.error('[v0] Puzzle win claim error:', error);
    res.status(500).json({ message: error.message || 'Failed to claim reward' });
  }
});

// Get user's reward history
router.get('/my-rewards', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in token' });
    }

    const rewards = await GameReward.find({ userId })
      .sort({ rewardDate: -1 })
      .limit(100);

    const totalEarned = rewards.reduce((sum, r) => sum + r.amount, 0);

    res.json({
      message: 'User reward history',
      totalEarned,
      rewards
    });
  } catch (error) {
    console.error('[v0] Reward history error:', error);
    res.status(500).json({ message: 'Failed to fetch reward history' });
  }
});

// Check if user can claim today
router.get('/check-claim/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[v0] User ID extraction failed from token:', JSON.stringify(req.user));
      return res.status(400).json({ message: 'User ID not found in token', debug: 'Invalid or missing user ID in JWT' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingReward = await GameReward.findOne({
      userId,
      rewardType: type,
      rewardDate: { $gte: today }
    });

    const canClaim = !existingReward;

    res.json({
      message: 'Claim eligibility',
      canClaim,
      alreadyClaimed: !canClaim,
      nextClaimTime: canClaim ? null : new Date(today.getTime() + 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('[v0] Check claim error:', error);
    res.status(500).json({ message: 'Failed to check claim eligibility' });
  }
});

// Admin: Get all game rewards
router.get('/admin/all-rewards', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const rewards = await GameReward.find()
      .populate('userId', 'email phone balance')
      .sort({ rewardDate: -1 })
      .limit(500);

    const totalDistributed = rewards.reduce((sum, r) => sum + r.amount, 0);

    res.json({
      message: 'All game rewards',
      total: rewards.length,
      totalDistributed,
      data: rewards
    });
  } catch (error) {
    console.error('[v0] Admin rewards fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch rewards' });
  }
});

export default router;
