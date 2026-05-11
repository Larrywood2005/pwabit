import mongoose from 'mongoose';

const signalSubscriptionSchema = new mongoose.Schema({
  // Subscription Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Subscription Details
  subscriptionType: {
    type: String,
    enum: ['PREMIUM', 'VIP', 'ELITE'],
    required: true,
    default: 'PREMIUM'
  },
  
  // Pricing
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE'
  },
  
  isAutoRenewal: {
    type: Boolean,
    default: true
  },
  
  // Payment Info
  lastPaymentDate: {
    type: Date,
    default: null
  },
  
  nextRenewalDate: {
    type: Date,
    required: true
  },
  
  // Usage Stats
  totalSignalsReceived: {
    type: Number,
    default: 0
  },
  
  totalWins: {
    type: Number,
    default: 0
  },
  
  totalLosses: {
    type: Number,
    default: 0
  },
  
  winRatePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  totalProfitLoss: {
    type: Number,
    default: 0
  },
  
  // Features Access
  canReceiveSignals: {
    type: Boolean,
    default: true
  },
  
  canAccessArchive: {
    type: Boolean,
    default: true
  },
  
  canAccessAnalytics: {
    type: Boolean,
    default: true
  },
  
  // Cancellation (if status is CANCELLED)
  cancelledAt: {
    type: Date,
    default: null
  },
  
  cancellationReason: {
    type: String,
    default: null
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for queries
signalSubscriptionSchema.index({ userId: 1, providerId: 1 });
signalSubscriptionSchema.index({ userId: 1, status: 1 });
signalSubscriptionSchema.index({ providerId: 1, status: 1 });
signalSubscriptionSchema.index({ nextRenewalDate: 1 });

export default mongoose.model('SignalSubscription', signalSubscriptionSchema);
