/**
 * Backend Migration Handler for assigning userCode to existing users
 * This can be called via GET /auth/migrate-user-codes
 * Runs checks on every auth endpoint to ensure all users have codes
 */

import User from '../models/User.js';
import { generateUserCode } from '../utils/userCodeGenerator.js';

export const migrateUserCodesOnDemand = async () => {
  try {
    // Find all users without userCode
    const usersWithoutCode = await User.find({ userCode: { $exists: false } });
    
    console.log(`[v0] Found ${usersWithoutCode.length} users without userCode`);
    
    let migratedCount = 0;
    
    for (const user of usersWithoutCode) {
      try {
        user.userCode = await generateUserCode(User);
        await user.save();
        migratedCount++;
        console.log(`[v0] Migrated user ${user._id} with code ${user.userCode}`);
      } catch (error) {
        console.error(`[v0] Failed to migrate user ${user._id}:`, error.message);
      }
    }
    
    console.log(`[v0] Successfully migrated ${migratedCount}/${usersWithoutCode.length} users`);
    return {
      success: true,
      totalUsers: usersWithoutCode.length,
      migratedUsers: migratedCount,
      message: `Migration complete: ${migratedCount}/${usersWithoutCode.length} users upgraded with userCode`
    };
  } catch (error) {
    console.error('[v0] Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default migrateUserCodesOnDemand;
