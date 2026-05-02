import express from 'express';
import { authenticate } from '../middleware/auth.js';
import GameReward from '../models/GameReward.js';
import User from '../models/User.js';
import transactionLogger from '../services/transactionLogger.js';

const router = express.Router();

// Set Socket.io instance for real-time emissions
export const setSocketIO = (io) => {
  router.io = io;
  console.log('[Games Route] Socket.io instance set for real-time event emissions');
};

// Claim daily login reward
router.post('/claim-daily-login', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[v0] User ID extraction failed from token:', JSON.stringify(req.user));
      return res.status(400).json({ message: 'User ID not found in token', debug: 'Invalid or missing user ID in JWT' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const lastDailyLoginClaim = user.lastDailyLoginClaimAt;
    
    // CRITICAL: Check if user has already claimed within last 24 hours (not just today's date)
    if (lastDailyLoginClaim) {
      const timeSinceLastClaim = now.getTime() - lastDailyLoginClaim.getTime();
      const hoursSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastClaim);
        const nextClaimTime = new Date(lastDailyLoginClaim.getTime() + 24 * 60 * 60 * 1000);
        
        console.log(`[v0] Daily login claim blocked:`, {
          userId,
          lastClaimAt: lastDailyLoginClaim,
          hoursSinceLastClaim: hoursSinceLastClaim.toFixed(1),
          hoursRemaining
        });
        
        return res.status(429).json({
          message: `You can only claim the daily login bonus once every 24 hours. Come back in ${hoursRemaining} hours!`,
          error: 'daily_login_cooldown_active',
          nextClaimTime: nextClaimTime,
          hoursRemaining: hoursRemaining,
          lastClaimAt: lastDailyLoginClaim
        });
      }
    }

    // CRITICAL: Reward is EXACTLY $0.03 - NOT $0.30
    const rewardAmount = 0.03;
    const reward = new GameReward({
      userId,
      rewardType: 'daily-login',
      amount: rewardAmount,
      description: 'Daily login bonus'
    });
    await reward.save();

    // Update user balance - add EXACTLY $0.03 (no doubling/multiplying)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $inc: { 
          currentBalance: rewardAmount,
          puzzleGameBonuses: rewardAmount,
          totalBonusesEarned: rewardAmount,
          totalEarnings: rewardAmount,
          dailyLoginCount: 1
        },
        lastDailyLoginClaimAt: now
      },
      { new: true }
    );

    console.log(`[v0] Daily login reward claimed - CRITICAL VALIDATION:`, {
      userId: updatedUser?._id,
      rewardAmount: `$${rewardAmount.toFixed(2)}`,
      isExactlyThreeCents: rewardAmount === 0.03,
      balanceBefore: ((updatedUser?.currentBalance || 0) - rewardAmount).toFixed(2),
      balanceAfter: (updatedUser?.currentBalance || 0).toFixed(2),
      lastClaimAt: updatedUser?.lastDailyLoginClaimAt,
      nextClaimTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    });

    // Log transaction with balance snapshot
    await transactionLogger.logBalanceTransaction(updatedUser?._id, 'daily_login_bonus', rewardAmount, {
      rewardType: 'daily-login',
      description: 'Daily login bonus ($0.03)',
      rewardId: reward._id
    });

    // Emit Socket.io event for real-time transaction update
    if (router.io) {
      router.io.to(`user_${userId}`).emit('bonus-claimed', {
        id: reward._id,
        amount: rewardAmount,
        type: 'daily-login',
        timestamp: now
      });
      console.log(`[Socket.io] Bonus claimed event emitted for user: ${userId}`);
    }

    res.json({
      message: 'Daily login reward claimed successfully! Come back in 24 hours.',
      reward: {
        amount: rewardAmount,
        type: 'daily-login',
        amountExactly: '$0.03', // Explicit confirmation
        newBalance: updatedUser?.currentBalance || 0,
        totalEarnings: updatedUser?.totalEarnings || 0,
        puzzleGameBonuses: updatedUser?.puzzleGameBonuses || 0,
        nextClaimTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('[v0] Daily login claim error:', error);
    res.status(500).json({ message: 'Failed to claim reward' });
  }
});

// Claim puzzle win reward (once per 24 hours, exactly $0.03 - CRITICAL: NO DOUBLING)
router.post('/claim-puzzle-win', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[v0] User ID extraction failed from token:', JSON.stringify(req.user));
      return res.status(400).json({ message: 'User ID not found in token', debug: 'Invalid or missing user ID in JWT' });
    }

    // Get user to check game play cooldown
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const lastPlayed = user.lastGamePlayedAt;
    
    // CRITICAL: Check if user has already played game within last 24 hours
    if (lastPlayed) {
      const timeSinceLastPlay = now.getTime() - lastPlayed.getTime();
      const hoursSinceLastPlay = timeSinceLastPlay / (1000 * 60 * 60);
      
      if (hoursSinceLastPlay < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastPlay);
        const nextPlayTime = new Date(lastPlayed.getTime() + 24 * 60 * 60 * 1000);
        
        console.log(`[v0] Game play restriction enforced:`, {
          userId,
          lastPlayedAt: lastPlayed,
          hoursSinceLastPlay: hoursSinceLastPlay.toFixed(1),
          hoursRemaining,
          nextPlayTime
        });
        
        return res.status(429).json({
          message: `You can only play the game once every 24 hours. Come back in ${hoursRemaining} hours!`,
          error: 'game_cooldown_active',
          nextPlayTime: nextPlayTime,
          hoursRemaining: hoursRemaining,
          lastPlayedAt: lastPlayed
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Check if user already won today (backup check)
    const existingReward = await GameReward.findOne({
      userId,
      rewardType: 'puzzle-win',
      rewardDate: { $gte: today, $lt: tomorrow }
    });

    if (existingReward) {
      return res.status(400).json({
        message: 'You have already claimed the puzzle reward today. Come back tomorrow!',
        nextClaimTime: tomorrow
      });
    }

    // CRITICAL: Reward is EXACTLY $0.03 - NOT doubled, NOT multiplied, NOT accumulated
    const rewardAmount = 0.03;
    
    const reward = new GameReward({
      userId,
      rewardType: 'puzzle-win',
      amount: rewardAmount,
      description: 'Puzzle game reward'
    });
    await reward.save();

    // Update user balance - add EXACTLY $0.03 (no doubling/multiplying)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $inc: { 
          currentBalance: rewardAmount,
          puzzleGameBonuses: rewardAmount,
          totalBonusesEarned: rewardAmount,
          totalEarnings: rewardAmount,
          gamePlayCount: 1,
          gameRewardCount: 1
        },
        lastGamePlayedAt: now,
        lastGameRewardAt: now,
        nextGamePlayTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        canPlayGame: false
      },
      { new: true }
    );

    // CRITICAL: Log to verify EXACTLY $0.03 reward, not doubled
    console.log(`[v0] Puzzle game reward claimed - CRITICAL VALIDATION:`, {
      userId: updatedUser?._id,
      rewardAmount: `$${rewardAmount.toFixed(2)}`,
      isExactlyThreeCents: rewardAmount === 0.03,
      isNotDoubled: rewardAmount !== 0.06,
      balanceBefore: ((updatedUser?.currentBalance || 0) - rewardAmount).toFixed(2),
      balanceAfter: (updatedUser?.currentBalance || 0).toFixed(2),
      gamePlayCount: updatedUser?.gamePlayCount,
      gameRewardCount: updatedUser?.gameRewardCount,
      lastGamePlayedAt: updatedUser?.lastGamePlayedAt,
      nextGamePlayTime: updatedUser?.nextGamePlayTime
    });

    // Log transaction with balance snapshot
    await transactionLogger.logBalanceTransaction(updatedUser?._id, 'puzzle_game_bonus', rewardAmount, {
      rewardType: 'puzzle-win',
      description: 'Puzzle game reward ($0.03)',
      rewardId: reward._id
    });

    // Emit Socket.io event for real-time transaction update
    if (router.io) {
      router.io.to(`user_${userId}`).emit('game-reward-claimed', {
        id: reward._id,
        amount: rewardAmount,
        type: 'puzzle-win',
        timestamp: now
      });
      console.log(`[Socket.io] Game reward claimed event emitted for user: ${userId}`);
    }

    res.json({
      message: 'Puzzle reward claimed successfully! You can play again in 24 hours.',
      reward: {
        amount: rewardAmount,
        type: 'puzzle-win',
        amountExactly: '$0.03', // Explicit confirmation
        newBalance: updatedUser?.currentBalance || 0,
        totalEarnings: updatedUser?.totalEarnings || 0,
        puzzleGameBonuses: updatedUser?.puzzleGameBonuses || 0,
        gamePlayCount: updatedUser?.gamePlayCount || 0,
        nextPlayTime: updatedUser?.nextGamePlayTime
      }
    });
  } catch (error) {
    console.error('[v0] Puzzle win claim error:', error);
    res.status(500).json({ message: error.message || 'Failed to claim reward' });
  }
});

// Get game play availability - Check if user can play game
router.get('/check-game-availability', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in token' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const lastPlayed = user.lastGamePlayedAt;
    
    let canPlay = true;
    let timeUntilNextPlay = 0;
    let nextPlayTime = new Date();
    
    if (lastPlayed) {
      const timeSinceLastPlay = now.getTime() - lastPlayed.getTime();
      const hoursSinceLastPlay = timeSinceLastPlay / (1000 * 60 * 60);
      
      if (hoursSinceLastPlay < 24) {
        canPlay = false;
        timeUntilNextPlay = 24 - hoursSinceLastPlay;
        nextPlayTime = new Date(lastPlayed.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    console.log(`[v0] Game availability checked:`, {
      userId,
      canPlay,
      lastPlayedAt: lastPlayed,
      nextPlayTime,
      hoursRemaining: timeUntilNextPlay.toFixed(1)
    });

    res.json({
      canPlay,
      message: canPlay ? 'You can play the game now!' : `Come back in ${Math.ceil(timeUntilNextPlay)} hours`,
      lastPlayedAt: lastPlayed,
      nextPlayTime: nextPlayTime,
      hoursRemaining: timeUntilNextPlay.toFixed(1),
      gamePlayCount: user.gamePlayCount || 0,
      gameRewardCount: user.gameRewardCount || 0
    });
  } catch (error) {
    console.error('[v0] Game availability check error:', error);
    res.status(500).json({ message: 'Failed to check game availability' });
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

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    let canClaim = true;
    let nextClaimTime = null;

    // Check based on type
    if (type === 'puzzle') {
      const lastPlayed = user.lastGamePlayedAt;
      if (lastPlayed) {
        const timeSinceLastPlay = now.getTime() - lastPlayed.getTime();
        const hoursSinceLastPlay = timeSinceLastPlay / (1000 * 60 * 60);
        
        if (hoursSinceLastPlay < 24) {
          canClaim = false;
          nextClaimTime = new Date(lastPlayed.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    } else if (type === 'daily-login') {
      const lastClaim = user.lastDailyLoginClaimAt;
      if (lastClaim) {
        const timeSinceLastClaim = now.getTime() - lastClaim.getTime();
        const hoursSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60);
        
        if (hoursSinceLastClaim < 24) {
          canClaim = false;
          nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    }

    res.json({
      message: 'Claim eligibility',
      canClaim,
      alreadyClaimed: !canClaim,
      nextClaimTime: nextClaimTime
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
