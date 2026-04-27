import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'received_powaup_from_user',
      'received_usd_from_user',
      'received_powaup_from_admin',
      'received_usd_from_admin',
      'referral_commission',
      'daily_bonus',
      'game_reward',
      'withdrawal_completed'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'PowaUp'],
    default: 'USD'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    // Auto-delete after 30 days
    expire: 2592000
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create composite index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
