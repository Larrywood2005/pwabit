import mongoose from 'mongoose';

const signalPaymentSchema = new mongoose.Schema({
  // Transaction Reference
  signalTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalTransaction',
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
  
  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    enum: ['USDT', 'USDC', 'DAI'],
    default: 'USDT'
  },
  
  network: {
    type: String,
    enum: ['ETHEREUM', 'POLYGON', 'TRON', 'BSC'],
    default: 'ETHEREUM'
  },
  
  // Wallet Details
  fromAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  
  toAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  
  // Transaction Hashes
  txHash: {
    type: String,
    default: null,
    unique: true,
    sparse: true
  },
  
  // Status
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMING', 'CONFIRMED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  
  confirmations: {
    type: Number,
    default: 0
  },
  
  requiredConfirmations: {
    type: Number,
    default: 6
  },
  
  // Gas Fee (if applicable)
  gasFee: {
    type: Number,
    default: null
  },
  
  // Error Tracking
  errorMessage: {
    type: String,
    default: null
  },
  
  // Retry Information
  retryCount: {
    type: Number,
    default: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  confirmedAt: {
    type: Date,
    default: null
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
});

// Index for queries
signalPaymentSchema.index({ userId: 1, createdAt: -1 });
signalPaymentSchema.index({ providerId: 1, createdAt: -1 });
signalPaymentSchema.index({ paymentStatus: 1 });
signalPaymentSchema.index({ txHash: 1 });
signalPaymentSchema.index({ fromAddress: 1 });

export default mongoose.model('SignalPayment', signalPaymentSchema);
