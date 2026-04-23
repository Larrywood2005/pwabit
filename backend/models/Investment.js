import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Investment Details
  packageId: String, // e.g., 'starter', 'premium', 'elite'
  packageName: String,
  amount: { type: Number, required: true },
  dailyReturnPercent: { type: Number, default: 3 },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  
  // Return Tracking
  totalReturnsEarned: { type: Number, default: 0 },
  lastReturnDate: Date,
  nextReturnDate: Date,
  returnHistory: [{
    date: Date,
    amount: Number,
    compounded: Boolean
  }],
  
  // Activation & Withdrawal Lock
  activatedAt: Date, // When investment becomes active
  withdrawalLockUntil: Date, // 24 hours after trade completion - funds locked
  
  // Trading
  canTradeAfter: Date, // 24h after activation
  lastTradedAt: Date,
  tradingCount: { type: Number, default: 0 },
  
  // Locked Funds (for active trades)
  lockedAmount: { type: Number, default: 0 },
  tradeInProgress: { type: Boolean, default: false },
  tradeStartTime: Date,
  tradeEndTime: Date,
  tradeProfit: { type: Number, default: 0 },
  tradeHistory: [{
    startTime: Date,
    endTime: Date,
    lockedAmount: Number,
    profitPercentage: { type: Number, default: 0 },
    profitAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
  }],
  
  // Withdrawal
  canWithdrawAfter: Date,
  isWithdrawn: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false }, // Trade completed status
  withdrawnAt: Date,
  withdrawnAmount: Number,
  
  // Payment Receipt
  paymentReceipt: {
    fileName: String,
    fileUrl: String,  // URL to uploaded receipt image
    uploadedAt: Date,
    receiptType: { type: String, enum: ['image', 'pdf'], default: 'image' }
  },
  paymentReceiptVerificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  paymentReceiptVerifiedBy: mongoose.Schema.Types.ObjectId, // Admin ID
  paymentReceiptVerifiedAt: Date,
  paymentReceiptRejectionReason: String,
  
  // Currency
  currency: { type: String, enum: ['USD'], default: 'USD' }, // Crypto only
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Investment', investmentSchema);
