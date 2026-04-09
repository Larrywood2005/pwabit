import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Activity Details
  activityType: { 
    type: String, 
    enum: ['daily_spin', 'daily_game', 'referral_bonus', 'login_bonus', 'task_completion'],
    required: true 
  },
  title: String,
  description: String,
  
  // Reward
  rewardAmount: { type: Number, required: true },
  rewardCurrency: { type: String, default: 'USD' },
  maxDailyReward: { type: Number, default: 0.5 },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'credited', 'cancelled'],
    default: 'pending' 
  },
  
  // Completion
  completedAt: Date,
  creditedAt: Date,
  
  // Tracking
  lastCompletionDate: Date,
  totalCompletions: { type: Number, default: 1 },
  
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Activity', activitySchema);
