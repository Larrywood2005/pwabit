/**
 * User Code Generation Utility
 * Generates unique 6-digit numeric codes for users
 */

export const generateUserCode = async (User) => {
  let code;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 50;
  
  while (exists && attempts < maxAttempts) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await User.findOne({ userCode: code });
    exists = !!existingUser;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('[v0] Could not generate unique userCode - database may be too full');
  }
  
  return code;
};

export default generateUserCode;
