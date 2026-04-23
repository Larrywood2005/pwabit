import mongoose from 'mongoose';

const dailyRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Reward Type (Independent systems)
  rewardType: { 
    type: String, 
    enum: ['game_win', 'daily_login'],
    required: true 
  },
  
  // Amount and Details
  amount: { type: Number, default: 0.3 }, // Standard reward is $0.3
  earnedAt: { type: Date, default: Date.now },
  
  // Tracking
  playDate: { type: Date, default: () => new Date().toDateString() },
  
  // For game rewards
  gameSessionId: mongoose.Schema.Types.ObjectId,
  gameDifficulty: Number,
  
  // For login rewards
  loginStreak: Number,
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['pending', 'credited', 'failed'],
    default: 'pending'
  },
  creditedAt: Date
}, { timestamps: true });

export default mongoose.model('DailyReward', dailyRewardSchema);
