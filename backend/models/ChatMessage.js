import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  // Message sender and receiver
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Allow null for contact form messages
  },
  userEmail: { type: String, required: true }, // Cache for display
  userName: { type: String, required: true }, // Cache for display
  
  // Message content
  sender: {
    type: String,
    enum: ['user', 'admin', 'ai', 'contact', 'ai-support'],
    default: 'user'
  },
  message: String, // Text message (optional if image present)
  image: String, // Image URL or path (optional if text present)
  imageType: String, // MIME type: image/jpeg, image/png, etc.
  subject: String, // For contact form messages
  
  // Validation
  hasText: { type: Boolean, default: false },
  hasImage: { type: Boolean, default: false },
  
  // Admin tracking
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  replyTime: Date,
  isResolved: { type: Boolean, default: false },
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast queries
chatMessageSchema.index({ userId: 1, timestamp: -1 });
chatMessageSchema.index({ sender: 1, timestamp: -1 });
chatMessageSchema.index({ isResolved: 1 });

// Pre-save validation: ensure message or image is present
chatMessageSchema.pre('save', function(next) {
  this.hasText = !!this.message && this.message.trim().length > 0;
  this.hasImage = !!this.image;
  
  if (!this.hasText && !this.hasImage) {
    return next(new Error('Message must contain either text or image'));
  }
  
  next();
});

export default mongoose.model('ChatMessage', chatMessageSchema);
