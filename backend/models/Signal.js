import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Signal Details
  tradingPair: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'ADA/USDT', 'SOL/USDT', 'BNB/USDT'],
    default: 'BTC/USDT'
  },
  
  // Signal Direction
  direction: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL', 'HOLD'],
    default: 'BUY'
  },
  
  // Entry & Exit Points
  entryPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  targetPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  stopLossPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Risk Management
  riskRewardRatio: {
    type: Number,
    required: true,
    min: 0.1,
    max: 10
  },
  
  winRatePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Signal Status & Lifecycle
  status: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'CANCELLED', 'PARTIAL_HIT'],
    default: 'ACTIVE'
  },
  
  isPublished: {
    type: Boolean,
    default: false
  },
  
  // Performance Tracking
  resultPrice: {
    type: Number,
    default: null
  },
  
  resultStatus: {
    type: String,
    enum: ['WIN', 'LOSS', 'BREAKEVEN', null],
    default: null
  },
  
  profitLossPips: {
    type: Number,
    default: null
  },
  
  // Timeframes
  timeframe: {
    type: String,
    enum: ['15M', '1H', '4H', '1D', '1W'],
    default: '1H'
  },
  
  validUntil: {
    type: Date,
    required: true
  },
  
  // Meta
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  providerName: {
    type: String,
    required: true
  },
  
  subscribers: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  publishedAt: {
    type: Date,
    default: null
  },
  
  closedAt: {
    type: Date,
    default: null
  }
});

// Index for queries
signalSchema.index({ providerId: 1, createdAt: -1 });
signalSchema.index({ status: 1, isPublished: 1 });
signalSchema.index({ tradingPair: 1, createdAt: -1 });

export default mongoose.model('Signal', signalSchema);
