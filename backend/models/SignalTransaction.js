import mongoose from 'mongoose';

const signalTransactionSchema = new mongoose.Schema({
  // Reference
  signalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signal',
    required: true
  },
  
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalSubscription',
    required: true
  },
  
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
  
  // Transaction Details
  type: {
    type: String,
    enum: ['SIGNAL_SUBSCRIPTION', 'RENEWAL', 'UPGRADE'],
    required: true,
    default: 'SIGNAL_SUBSCRIPTION'
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['BALANCE', 'FRESH_USDT'],
    required: true
  },
  
  // For FRESH_USDT transactions
  walletAddress: {
    type: String,
    default: null
  },
  
  txHash: {
    type: String,
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  
  failureReason: {
    type: String,
    default: null
  },
  
  // Revenue Tracking (for provider)
  providerRevenue: {
    type: Number,
    required: true,
    min: 0
  },
  
  platformFee: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: {
    type: Date,
    default: null
  }
});

// Index for queries
signalTransactionSchema.index({ userId: 1, createdAt: -1 });
signalTransactionSchema.index({ providerId: 1, createdAt: -1 });
signalTransactionSchema.index({ status: 1 });
signalTransactionSchema.index({ signalId: 1 });

export default mongoose.model('SignalTransaction', signalTransactionSchema);
