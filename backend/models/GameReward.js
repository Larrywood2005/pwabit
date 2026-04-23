import mongoose from 'mongoose';

const gameRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewardType: {
    type: String,
    enum: ['puzzle-win', 'daily-login'],
    required: true
  },
  amount: {
    type: Number,
    default: 0.03 // CRITICAL: Exactly $0.03 per reward (NOT $0.30)
  },
  rewardDate: {
    type: Date,
    default: Date.now
  },
  lastRewardDate: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index to prevent multiple rewards on same day
gameRewardSchema.index({ userId: 1, rewardType: 1, rewardDate: 1 });

export default mongoose.model('GameReward', gameRewardSchema);
