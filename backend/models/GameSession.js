import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Game Details
  gameType: { type: String, default: 'puzzle' }, // Type of game
  difficulty: { type: Number, min: 1, max: 5, required: true }, // Difficulty level 1-5
  status: { 
    type: String, 
    enum: ['in_progress', 'completed_win', 'completed_loss'], 
    default: 'in_progress' 
  },
  
  // Game Tracking
  attempts: { type: Number, default: 0 },
  correctAnswer: String,
  userAnswer: String,
  result: String, // 'correct' or 'incorrect'
  reward: { type: Number, default: 0 }, // $0.3 if won
  
  // Timestamps
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  
  // Daily Tracking
  playDate: { type: Date, default: () => new Date().toDateString() },
  isFirstWinOfDay: { type: Boolean, default: false } // Only first win of day gets reward
}, { timestamps: true });

export default mongoose.model('GameSession', gameSessionSchema);
