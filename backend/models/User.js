import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Info
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  avatar: { type: String, default: null }, // User avatar URL/image
  userCode: { type: String, unique: true, sparse: true }, // CRITICAL: 6-digit unique identifier for giveaway system
  // Verification
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Withdrawal OTP (for secure withdrawal verification)
  withdrawalOTP: { type: String, default: null },
  withdrawalOTPExpire: { type: Date, default: null },
  withdrawalOTPVerified: { type: Boolean, default: false },
  
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
    verifiedBy: mongoose.Schema.Types.ObjectId, // Admin ID
    rejectedAt: Date,
    rejectedBy: mongoose.Schema.Types.ObjectId,
    rejectionReason: String,
    status: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    }
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
  totalWithdrawn: { type: Number, default: 0 }, // CRITICAL: Sum of all withdrawal amounts (never decreases)
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
  
  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Direct referrer (Tier 1)
  referrals: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tier: { type: Number, enum: [1, 2, 3] }, // 1 = direct, 2 = second level, 3 = third level
    joinedAt: { type: Date, default: Date.now },
    totalInvested: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 }
  }],
  referralStats: {
    tier1Count: { type: Number, default: 0 }, // Direct referrals
    tier2Count: { type: Number, default: 0 }, // Second level
    tier3Count: { type: Number, default: 0 }, // Third level
    tier1Earnings: { type: Number, default: 0 }, // 5% commissions
    tier2Earnings: { type: Number, default: 0 }, // 2% commissions
    tier3Earnings: { type: Number, default: 0 }, // 1% commissions
    totalReferrals: { type: Number, default: 0 },
    activeReferrals: { type: Number, default: 0 }
  },
  
  // Game Play Tracking - 24-Hour Restriction
  lastGamePlayedAt: { type: Date, default: null }, // When user last played the puzzle game
  lastDailyLoginClaimAt: { type: Date, default: null }, // FIXED: Track daily login claim (24-hour cooldown)
  gamePlayCount: { type: Number, default: 0 }, // Total games played
  lastGameRewardAt: { type: Date, default: null }, // When user last claimed game reward
  gameRewardCount: { type: Number, default: 0 }, // Total game rewards claimed
  canPlayGame: { type: Boolean, default: true }, // Can user play game now (based on 24h cooldown)
  nextGamePlayTime: { type: Date, default: Date.now }, // When user can next play game
  dailyLoginCount: { type: Number, default: 0 }, // FIXED: Track total daily login bonuses claimed
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Generate unique referral code before saving
userSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    // Generate a unique 8-character referral code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 10;
    
    // Check for uniqueness
    while (attempts < maxAttempts) {
      const existing = await mongoose.model('User').findOne({ referralCode: code });
      if (!existing) {
        this.referralCode = code;
        break;
      }
      code = generateCode();
      attempts++;
    }
    
    if (!this.referralCode) {
      // Fallback: use timestamp-based code
      this.referralCode = 'REF' + Date.now().toString(36).toUpperCase().slice(-5);
    }
  }
  next();
});

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
