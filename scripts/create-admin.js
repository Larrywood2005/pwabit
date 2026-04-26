import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Admin Schema
const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'moderator', 'support'],
    default: 'admin' 
  },
  permissions: [String],
  isActive: { type: Boolean, default: true },
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

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcryptjs.hash(this.password, 10);
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/powabitz');
    console.log('[v0] Connected to MongoDB');

    // Default admin credentials
    const defaultAdmin = {
      fullName: 'Admin',
      email: 'admin@powabitz.com',
      password: 'Iis4you123$%@*(cracked)',
      role: 'super_admin',
      permissions: ['all'],
      isActive: true
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: defaultAdmin.email });
    if (existingAdmin) {
      console.log('[v0] Admin already exists:', defaultAdmin.email);
      console.log('[v0] To update password, use admin dashboard or database migration');
    } else {
      // Create new admin
      const admin = new Admin(defaultAdmin);
      await admin.save();
      console.log('[v0] Admin account created successfully!');
      console.log('[v0] Login with these credentials:');
      console.log('  Email:', defaultAdmin.email);
      console.log('  Password:', defaultAdmin.password);
    }

    await mongoose.connection.close();
    console.log('[v0] Database connection closed');
  } catch (error) {
    console.error('[v0] Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
