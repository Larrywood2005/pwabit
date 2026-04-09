import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Transaction Type
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'return', 'activity_reward', 'transfer'],
    required: true 
  },
  
  // Amount Details
  amount: { type: Number, required: true },
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
  transactionHash: String, // Blockchain tx hash
  networkFee: Number,
  
  // Related Investment
  investmentId: mongoose.Schema.Types.ObjectId,
  
  // Admin Actions
  confirmedBy: mongoose.Schema.Types.ObjectId, // Admin ID
  confirmationNotes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  confirmedAt: Date,
  completedAt: Date
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
