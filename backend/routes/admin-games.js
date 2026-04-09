import express from 'express';
import { authenticate } from '../middleware/auth.js';
import GameSession from '../models/GameSession.js';
import DailyReward from '../models/DailyReward.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization error', error: error.message });
  }
};

// Get all game sessions
router.get('/sessions', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, difficulty, limit = 20, page = 1, userId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (difficulty) query.difficulty = parseInt(difficulty);
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const sessions = await GameSession.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await GameSession.countDocuments(query);
    
    res.json({
      sessions: sessions.map(session => ({
        sessionId: session._id,
        userId: session.userId?._id,
        userName: session.userId?.fullName,
        userEmail: session.userId?.email,
        gameType: session.gameType,
        difficulty: session.difficulty,
        status: session.status,
        result: session.result,
        reward: session.reward,
        isFirstWinOfDay: session.isFirstWinOfDay,
        attempts: session.attempts,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        createdAt: session.createdAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game sessions', error: error.message });
  }
});

// Get single game session details
router.get('/session/:sessionId', authenticate, adminOnly, async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.sessionId)
      .populate('userId', 'fullName email currentBalance gameStats');
    
    if (!session) {
      return res.status(404).json({ message: 'Game session not found' });
    }
    
    res.json({
      session,
      userDetails: {
        fullName: session.userId?.fullName,
        email: session.userId?.email,
        currentBalance: session.userId?.currentBalance,
        totalGamesPlayed: session.userId?.gameStats?.totalGamesPlayed,
        totalGameWins: session.userId?.gameStats?.dailyGameWins
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game session', error: error.message });
  }
});

// Get game statistics
router.get('/statistics', authenticate, adminOnly, async (req, res) => {
  try {
    const totalGames = await GameSession.countDocuments();
    const totalWins = await GameSession.countDocuments({ status: 'completed_win' });
    const totalLosses = await GameSession.countDocuments({ status: 'completed_loss' });
    const totalRewardsDistributed = await DailyReward.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    
    // Games by difficulty
    const gamesByDifficulty = await GameSession.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Games by status
    const gamesByStatus = await GameSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Rewards by type
    const rewardsByType = await DailyReward.aggregate([
      { $group: { _id: '$rewardType', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);
    
    // Most active users (top 10)
    const topUsers = await GameSession.aggregate([
      { $group: { _id: '$userId', gameCount: { $sum: 1 }, wins: { $sum: { $cond: [{ $eq: ['$status', 'completed_win'] }, 1, 0] } } } },
      { $sort: { gameCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } }
    ]);
    
    res.json({
      overview: {
        totalGames,
        totalWins,
        totalLosses,
        winRate: ((totalWins / totalGames) * 100).toFixed(2) + '%',
        totalRewardsDistributed: totalRewardsDistributed[0]?.totalAmount || 0
      },
      gamesByDifficulty,
      gamesByStatus,
      rewardsByType,
      topUsers: topUsers.map(user => ({
        userId: user._id,
        userName: user.userInfo[0]?.fullName,
        userEmail: user.userInfo[0]?.email,
        gameCount: user.gameCount,
        wins: user.wins,
        winRate: ((user.wins / user.gameCount) * 100).toFixed(2) + '%'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game statistics', error: error.message });
  }
});

// Get daily rewards
router.get('/rewards', authenticate, adminOnly, async (req, res) => {
  try {
    const { type, limit = 20, page = 1, userId, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (type) query.rewardType = type;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.earnedAt = {};
      if (startDate) query.earnedAt.$gte = new Date(startDate);
      if (endDate) query.earnedAt.$lte = new Date(endDate);
    }
    
    const rewards = await DailyReward.find(query)
      .populate('userId', 'fullName email')
      .sort({ earnedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await DailyReward.countDocuments(query);
    
    res.json({
      rewards: rewards.map(reward => ({
        rewardId: reward._id,
        userId: reward.userId?._id,
        userName: reward.userId?.fullName,
        userEmail: reward.userId?.email,
        rewardType: reward.rewardType,
        amount: reward.amount,
        status: reward.status,
        earnedAt: reward.earnedAt,
        creditedAt: reward.creditedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rewards', error: error.message });
  }
});

// Get user game history (admin view)
router.get('/user/:userId/games', authenticate, adminOnly, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const games = await GameSession.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await GameSession.countDocuments({ userId: req.params.userId });
    
    res.json({
      user: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        currentBalance: user.currentBalance,
        gameStats: user.gameStats
      },
      games,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user games', error: error.message });
  }
});

export default router;
