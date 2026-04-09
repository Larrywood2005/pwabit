import mongoose from 'mongoose';

const walletAddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  walletType: {
    type: String,
    enum: ['bitcoin', 'ethereum', 'usdt', 'usdc', 'other'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Ensure only one default wallet per user
walletAddressSchema.index({ userId: 1, isDefault: 1 });

export default mongoose.model('WalletAddress', walletAddressSchema);
