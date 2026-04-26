import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Admin Schema
const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'super_admin' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

const Admin = mongoose.model('Admin', adminSchema);

const initializeAdmin = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/powabitz';
    console.log('[v0] Connecting to MongoDB:', mongoUri);
    
    await mongoose.connect(mongoUri);
    
    console.log('[v0] MongoDB connected successfully');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@powabitz.com' });
    
    if (existingAdmin) {
      console.log('[v0] Admin account already exists: admin@powabitz.com');
      console.log('[v0] Use this account to login');
    } else {
      // Create new admin
      const admin = new Admin({
        fullName: 'Admin User',
        email: 'admin@powabitz.com',
        password: 'Iis4you123$%@*(cracked)',
        role: 'super_admin'
      });

      await admin.save();
      console.log('[v0] Admin account created successfully!');
      console.log('[v0] Email: admin@powabitz.com');
      console.log('[v0] Password: Iis4you123$%@*(cracked)');
      console.log('[v0] You can now login to http://localhost:3000/auth/admin-login');
    }

    await mongoose.disconnect();
    console.log('[v0] Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('[v0] Error initializing admin:', error);
    process.exit(1);
  }
};

initializeAdmin();
