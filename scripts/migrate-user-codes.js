import mongoose from 'mongoose';
import User from '../models/User.js';

/**
 * Migration script: Generate unique 6-digit userCodes for all existing users
 * Run once: node scripts/migrate-user-codes.js
 */

const generateUserCode = async () => {
  let code;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (exists && attempts < maxAttempts) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ userCode: code });
    exists = !!existingUser;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Could not generate unique userCode after 100 attempts');
  }
  
  return code;
};

export const migrateUserCodes = async () => {
  try {
    console.log('[v0] Starting user code migration...');
    
    const usersWithoutCode = await User.find({ userCode: { $exists: false } });
    console.log(`[v0] Found ${usersWithoutCode.length} users without userCode`);
    
    let updated = 0;
    let errors = 0;
    
    for (const user of usersWithoutCode) {
      try {
        const userCode = await generateUserCode();
        user.userCode = userCode;
        await user.save();
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`[v0] Migrated ${updated} users...`);
        }
      } catch (err) {
        console.error(`[v0] Error migrating user ${user._id}:`, err.message);
        errors++;
      }
    }
    
    console.log(`[v0] Migration complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  } catch (error) {
    console.error('[v0] Migration failed:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await migrateUserCodes();
    await mongoose.connection.close();
    process.exit(0);
  }).catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
}
