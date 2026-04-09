import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Wallet Addresses for Deposits
  depositAddresses: {
    btc: String,
    eth: String,
    usdt: String,
    ltc: String,
    doge: String
  },
  
  // Balance Tracking
  balances: {
    btc: { type: Number, default: 0 },
    eth: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 },
    ltc: { type: Number, default: 0 },
    doge: { type: Number, default: 0 }
  },
  
  // Conversion Rate (USD equivalent)
  usdEquivalent: { type: Number, default: 0 },
  
  // Pending Deposits
  pendingDeposits: [{
    currency: String,
    amount: Number,
    walletAddress: String,
    transactionHash: String,
    confirmedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Withdrawal History
  withdrawalHistory: [{
    currency: String,
    amount: Number,
    toAddress: String,
    transactionHash: String,
    status: String,
    timestamp: Date
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
