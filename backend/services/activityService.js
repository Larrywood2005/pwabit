import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const ACTIVITY_TYPES = {
  DAILY_SPIN: 'daily_spin',
  DAILY_GAME: 'daily_game',
  REFERRAL: 'referral_bonus',
  LOGIN_BONUS: 'login_bonus',
  TASK: 'task_completion'
};

// Award activity
export const awardActivity = async (userId, activityType, rewardAmount = 0.5) => {
  try {
    // Check if already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingActivity = await Activity.findOne({
      userId,
      activityType,
      createdAt: { $gte: today }
    });
    
    if (existingActivity) {
      return { success: false, message: 'Already completed today' };
    }
    
    const activity = new Activity({
      userId,
      activityType,
      rewardAmount,
      status: 'credited',
      completedAt: new Date(),
      creditedAt: new Date()
    });
    
    await activity.save();
    
    // Create transaction
    const transaction = new Transaction({
      userId,
      type: 'activity_reward',
      amount: rewardAmount,
      status: 'confirmed',
      confirmedAt: new Date()
    });
    
    await transaction.save();
    
    // Update user balance and track earnings based on activity type
    const user = await User.findById(userId);
    user.currentBalance += rewardAmount;
    user.totalEarnings = (user.totalEarnings || 0) + rewardAmount;
    user.totalBonusesEarned = (user.totalBonusesEarned || 0) + rewardAmount;
    
    // Track specific earnings categories
    if (activityType === ACTIVITY_TYPES.REFERRAL) {
      user.referralEarnings = (user.referralEarnings || 0) + rewardAmount;
    } else if (activityType === ACTIVITY_TYPES.DAILY_GAME || activityType === ACTIVITY_TYPES.DAILY_SPIN) {
      user.puzzleGameBonuses = (user.puzzleGameBonuses || 0) + rewardAmount;
    }
    
    await user.save();
    
    console.log(`[ActivityService] Awarded ${activityType} to user ${userId}: $${rewardAmount}`);
    
    return {
      success: true,
      message: `Earned $${rewardAmount}`,
      activity
    };
  } catch (error) {
    console.error('[ActivityService] Error:', error);
    return { success: false, message: error.message };
  }
};

// Create activity endpoints (spin, game, task)
export const createDailySpin = async (userId) => {
  return awardActivity(userId, ACTIVITY_TYPES.DAILY_SPIN, Math.random() * 0.5);
};

export const createDailyGame = async (userId) => {
  return awardActivity(userId, ACTIVITY_TYPES.DAILY_GAME, 0.5);
};

export const createLoginBonus = async (userId) => {
  return awardActivity(userId, ACTIVITY_TYPES.LOGIN_BONUS, 0.1);
};

// Get user activities
export const getUserActivities = async (userId) => {
  return Activity.find({ userId }).sort('-createdAt');
};

// Get today's activities
export const getTodayActivities = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return Activity.find({
    userId,
    createdAt: { $gte: today }
  });
};

export default {
  awardActivity,
  createDailySpin,
  createDailyGame,
  createLoginBonus,
  getUserActivities,
  getTodayActivities,
  ACTIVITY_TYPES
};
