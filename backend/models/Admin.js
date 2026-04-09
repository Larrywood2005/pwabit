import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  // Admin Info
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  
  // Role & Permissions
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'moderator', 'support'],
    default: 'admin' 
  },
  permissions: [String], // e.g., ['verify_kyc', 'approve_deposits', 'manage_users']
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Activity Tracking
  lastLogin: Date,
  actions: [{
    actionType: String,
    userId: mongoose.Schema.Types.ObjectId,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

// Method to compare password
adminSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default mongoose.model('Admin', adminSchema);
