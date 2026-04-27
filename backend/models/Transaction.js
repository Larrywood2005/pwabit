import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Transaction Type
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'return', 'activity_reward', 'transfer', 'referral_commission', 'returns', 'giveaway_sent', 'giveaway_received', 'powaup_sent', 'powaup_received'],
    required: true 
  },
  
  // Description (for referral commissions and other transactions)
  description: String,
  
  // Additional details (for referral tier info, etc.)
  details: {
    tier: Number,
    percentage: Number,
    referredUserId: mongoose.Schema.Types.ObjectId,
    investmentAmount: Number,
    source: String
  },
  
  // Amount Details
  amount: { type: Number, required: true },
  withdrawalFee: { type: Number, default: 0 }, // 2% crypto network fee
  amountToPay: { type: Number, default: 0 }, // Amount after fee (amount - fee)
  currency: { type: String, default: 'USD' }, // Can be BTC, ETH, USDT
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'failed', 'cancelled', 'processing', 'completed'],
    default: 'pending' 
  },
  
  // Withdrawal-specific fields
  withdrawalStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed'],
    default: 'pending'
  },
  
  processedBy: mongoose.Schema.Types.ObjectId, // Admin ID who processed withdrawal
  processedAt: Date,
  paidOutAt: Date,
  paymentMethod: String, // Direct transfer, bank, wallet, etc.
  paymentNotes: String,
  
  // Crypto Details
  walletAddress: String,
  walletType: String, // BTC, ETH, USDT, etc.
  walletNetwork: String, // Mainnet, Testnet, Polygon, Arbitrum, etc.
  transactionHash: String, // Blockchain tx hash
  networkFee: Number,
  
  // Related Investment
  investmentId: mongoose.Schema.Types.ObjectId,
  
  // Giveaway Transfer Fields
  senderId: mongoose.Schema.Types.ObjectId, // For giveaway_sent
  receiverId: mongoose.Schema.Types.ObjectId, // For giveaway_received
  senderUserCode: String, // Sender's 6-digit code
  receiverUserCode: String, // Recipient's 6-digit code
  transferType: { type: String, enum: ['usd', 'powaup'], default: 'usd' }, // What was transferred
  // Admin Actions
  confirmedBy: mongoose.Schema.Types.ObjectId, // Admin ID
  confirmationNotes: String,
  
  // Withdrawal Processing Flags
  fundsDebited: { type: Boolean, default: false }, // True when user's balance has been deducted
  fundsDebitedAt: Date,
  rejectionReason: String,
  rejectedBy: mongoose.Schema.Types.ObjectId,
  rejectedAt: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  confirmedAt: Date,
  completedAt: Date
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
