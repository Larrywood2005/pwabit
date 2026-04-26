import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'follow_user_sent_powaup',      // A follow user sent you PowaUp credits
      'follow_user_sent_usd',         // A follow user sent you USD
      'admin_granted_powaup',         // Admin granted you PowaUp credits
      'admin_granted_usd',            // Admin granted you USD
      'referral_commission',          // You earned referral commission
      'investment_completed',         // Your investment matured
      'daily_bonus',                  // Daily bonus reward
      'game_reward',                  // Game reward received
      'withdrawal_completed',         // Withdrawal processed
      'system_notification'           // General system notification
    ],
    required: true
  },
  
  // Notification Content
  title: { type: String, required: true },
  message: { type: String, required: true },
  description: { type: String },
  
  // Related User (sender of funds/trigger of notification)
  relatedUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  relatedUserName: String,
  relatedUserCode: String,
  
  // Amount (if transaction-related)
  amount: { type: Number, default: 0 },
  currency: { type: String, enum: ['USD', 'PowaUp'], default: 'USD' },
  
  // Status
  isRead: { type: Boolean, default: false },
  readAt: Date,
  
  // Action Link
  actionUrl: String,
  actionType: String, // 'view_profile', 'view_transaction', 'view_details'
  
  // Metadata
  metadata: {
    transactionId: mongoose.Schema.Types.ObjectId,
    referralCode: String,
    relatedId: mongoose.Schema.Types.ObjectId,
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) }, // 30 days
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete after expiry

export default mongoose.model('Notification', notificationSchema);
