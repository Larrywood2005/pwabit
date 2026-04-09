import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Info
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  
  // Verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // KYC
  kycStatus: { 
    type: String, 
    enum: ['not_started', 'pending', 'verified', 'rejected'], 
    default: 'not_started' 
  },
  kycDocuments: {
    idType: String, // passport, driver_license, national_id
    idNumber: String,
    idImage: String,
    selfieImage: String,
    addressProof: String,
    submittedAt: Date,
    verifiedAt: Date,
    verifiedBy: mongoose.Schema.Types.ObjectId // Admin ID
  },
  
  // Account Status
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'flagged', 'deleted', 'blocked'], 
    default: 'active' 
  },
  suspicionFlags: [String], // Track reasons for suspension
  
  // User action tracking
  userActions: [{
    type: {
      type: String,
      enum: ['flag', 'suspend', 'delete', 'restore']
    },
    reason: String,
    actionTakenBy: mongoose.Schema.Types.ObjectId, // Admin ID
    actionTakenAt: { type: Date, default: Date.now },
    notes: String
  }],
  
  suspendedAt: Date,
  suspendedBy: mongoose.Schema.Types.ObjectId, // Admin ID
  suspensionReason: String,
  flaggedAt: Date,
  flaggedBy: mongoose.Schema.Types.ObjectId,
  flagReason: String,
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId, // Admin who deleted
  deletionReason: String,
  isDeleted: { type: Boolean, default: false },
  
  // Wallet Addresses
  walletAddresses: {
    btc: String,
    eth: String,
    usdt: String,
    custom: [{ name: String, address: String, network: String }]
  },
  
  // Financial Summary
  totalInvested: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  withdrawalBalance: { type: Number, default: 0 },
  
  // Bonus & Earnings Breakdown
  investmentReturns: { type: Number, default: 0 }, // From investments (dailyReturns * daysActive)
  puzzleGameBonuses: { type: Number, default: 0 }, // From puzzle game wins
  tradingBonuses: { type: Number, default: 0 }, // From PowaUp trading
  referralEarnings: { type: Number, default: 0 }, // From referrals
  totalBonusesEarned: { type: Number, default: 0 }, // Sum of all bonuses
  
  // PowaUp Trading Credits System
  powaUpBalance: { type: Number, default: 30 }, // 30 free credits on signup
  powaUpSpent: { type: Number, default: 0 }, // Total PowaUp used
  powaUpHistory: [{
    type: {
      type: String,
      enum: ['received', 'purchased', 'used', 'bonus']
    },
    amount: Number,
    cost: Number, // Cost in USD if purchased
    reason: String,
    transactionId: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now }
  }],
  totalPowaUpPurchased: { type: Number, default: 0 }, // Total spent on PowaUp in USD
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
