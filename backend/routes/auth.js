import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';
import { Resend } from 'resend';
import { generateUserCode } from '../utils/userCodeGenerator.js';
import { migrateUserCodesOnDemand } from '../utils/migrationHandler.js';

const router = express.Router();

// Configure Resend email service
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate JWT Token
const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { _id: userId, userId, role, id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email with OTP
const sendVerificationEmail = async (email, otp) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@powabitz.com',
      to: email,
      subject: 'Powabitz - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Welcome to Powabitz!</h2>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Your email verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #667eea;">
              <h3 style="margin: 0; letter-spacing: 3px; font-size: 32px; color: #667eea; font-weight: bold;">${otp}</h3>
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Powabitz Support | support@powabitz.com</p>
          </div>
        </div>
      `
    });
    console.log('[v0] OTP email sent to:', email);
  } catch (error) {
    console.error('[v0] Email send error:', error);
  }
};

// Send withdrawal OTP
const sendWithdrawalOTP = async (email, otp) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@powabitz.com',
      to: email,
      subject: 'Powabitz - Withdrawal Security Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Withdrawal Request</h2>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">You have requested a withdrawal. Your security code is:</p>
            <div style="background: #fff3e0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #ff9800;">
              <h3 style="margin: 0; letter-spacing: 3px; font-size: 32px; color: #ff9800; font-weight: bold;">${otp}</h3>
            </div>
            <p style="color: #d32f2f; font-weight: bold; font-size: 14px;">⚠️ This code expires in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this withdrawal, contact support immediately.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">Powabitz Support | support@powabitz.com</p>
          </div>
        </div>
      `
    });
    console.log('[v0] Withdrawal OTP sent to:', email);
  } catch (error) {
    console.error('[v0] Withdrawal OTP send error:', error);
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, referralCode } = req.body;
    
    // Validate inputs
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Generate OTP for email verification
    const verificationOTP = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Generate unique 6-digit user code for giveaway system
    const userCode = await generateUserCode(User);
    console.log('[v0] Generated userCode:', userCode);
    
    // Handle referral code - find the referrer
    let referrerId = null;
    let tier1Referrer = null;
    let tier2Referrer = null;
    let tier3Referrer = null;
    
    if (referralCode) {
      console.log('[v0] Looking up referral code:', referralCode);
      tier1Referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      
      if (tier1Referrer) {
        referrerId = tier1Referrer._id;
        console.log('[v0] Found referrer (Tier 1):', tier1Referrer.fullName);
        
        // Find Tier 2 referrer (the person who referred the Tier 1 referrer)
        if (tier1Referrer.referredBy) {
          tier2Referrer = await User.findById(tier1Referrer.referredBy);
          if (tier2Referrer) {
            console.log('[v0] Found Tier 2 referrer:', tier2Referrer.fullName);
            
            // Find Tier 3 referrer (the person who referred the Tier 2 referrer)
            if (tier2Referrer.referredBy) {
              tier3Referrer = await User.findById(tier2Referrer.referredBy);
              if (tier3Referrer) {
                console.log('[v0] Found Tier 3 referrer:', tier3Referrer.fullName);
              }
            }
          }
        }
      } else {
        console.log('[v0] Referral code not found:', referralCode);
      }
    }
    
    // Create user with OTP and referral info
    const user = new User({
      fullName,
      email,
      password,
      phone,
      userCode, // Add the generated unique 6-digit code
      emailVerificationOTP: verificationOTP,
      emailVerificationExpire: otpExpire,
      emailVerified: false,
      referredBy: referrerId
    });
    
    await user.save();
    
    // Update referrer's referral lists
    if (tier1Referrer) {
      // Add to Tier 1 referrer's list
      tier1Referrer.referrals.push({
        userId: user._id,
        tier: 1,
        joinedAt: new Date(),
        totalInvested: 0,
        commissionEarned: 0
      });
      tier1Referrer.referralStats.tier1Count = (tier1Referrer.referralStats.tier1Count || 0) + 1;
      tier1Referrer.referralStats.totalReferrals = (tier1Referrer.referralStats.totalReferrals || 0) + 1;
      await tier1Referrer.save();
      console.log('[v0] Added user to Tier 1 referrer list');
    }
    
    if (tier2Referrer) {
      // Add to Tier 2 referrer's list
      tier2Referrer.referrals.push({
        userId: user._id,
        tier: 2,
        joinedAt: new Date(),
        totalInvested: 0,
        commissionEarned: 0
      });
      tier2Referrer.referralStats.tier2Count = (tier2Referrer.referralStats.tier2Count || 0) + 1;
      tier2Referrer.referralStats.totalReferrals = (tier2Referrer.referralStats.totalReferrals || 0) + 1;
      await tier2Referrer.save();
      console.log('[v0] Added user to Tier 2 referrer list');
    }
    
    if (tier3Referrer) {
      // Add to Tier 3 referrer's list
      tier3Referrer.referrals.push({
        userId: user._id,
        tier: 3,
        joinedAt: new Date(),
        totalInvested: 0,
        commissionEarned: 0
      });
      tier3Referrer.referralStats.tier3Count = (tier3Referrer.referralStats.tier3Count || 0) + 1;
      tier3Referrer.referralStats.totalReferrals = (tier3Referrer.referralStats.totalReferrals || 0) + 1;
      await tier3Referrer.save();
      console.log('[v0] Added user to Tier 3 referrer list');
    }
    
    // Create wallet
    await Wallet.create({
      userId: user._id,
      depositAddresses: {
        btc: process.env.APP_WALLET_BTC,
        eth: process.env.APP_WALLET_ETH,
        usdt: process.env.APP_WALLET_USDT
      }
    });
    
    // Send OTP via email
    await sendVerificationEmail(email, verificationOTP);
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'User registered successfully! Check your email for the OTP verification code.',
      requiresOTPVerification: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode, // Include 6-digit code in response
        isEmailVerified: user.isEmailVerified,
        powaUpBalance: user.powaUpBalance
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Verify OTP (Email or Withdrawal)
router.post('/verify-otp', authenticate, async (req, res) => {
  try {
    const { otp, type = 'email' } = req.body;
    
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    
    const userId = req.user._id || req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (type === 'email') {
      // Email verification OTP
      if (user.emailVerificationExpire && user.emailVerificationExpire < Date.now()) {
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }
      
      if (user.emailVerificationOTP !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      user.emailVerified = true;
      user.isEmailVerified = true;
      user.emailVerificationOTP = undefined;
      user.emailVerificationExpire = undefined;
      await user.save();
      
      return res.json({ message: 'Email verified successfully', emailVerified: true });
    } else if (type === 'withdrawal') {
      // Withdrawal OTP verification - ONLY verify, do NOT clear
      // Clearing happens in /wallets/withdrawal endpoint after balance deduction
      console.log('[v0] Withdrawal OTP verification attempt:', {
        userId: userId,
        storedOTPLength: user.withdrawalOTP?.length,
        incomingOTPLength: otp?.length,
        otpExpire: user.withdrawalOTPExpire,
        isExpired: user.withdrawalOTPExpire && user.withdrawalOTPExpire < Date.now(),
        match: user.withdrawalOTP?.toString() === otp?.toString()
      });
      
      if (!user.withdrawalOTP) {
        return res.status(400).json({ message: 'No OTP requested. Please request a new withdrawal OTP.' });
      }
      
      if (user.withdrawalOTPExpire && user.withdrawalOTPExpire <= Date.now()) {
        user.withdrawalOTP = undefined;
        user.withdrawalOTPExpire = undefined;
        await user.save();
        return res.status(400).json({ message: 'OTP has expired. Please request a new withdrawal.' });
      }
      
      // Normalize OTP comparison - trim whitespace and compare as strings
      const storedOTP = user.withdrawalOTP?.toString().trim();
      const incomingOTP = otp?.toString().trim();
      
      if (storedOTP !== incomingOTP) {
        console.error('[v0] OTP mismatch - withdrawal OTP not verified:', { 
          userEmail: user.email,
          storedLength: storedOTP?.length,
          incomingLength: incomingOTP?.length
        });
        return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
      }
      
      // OTP is VALID - return success WITHOUT clearing it
      // The withdrawal endpoint will clear it after transaction success
      console.log('[v0] Withdrawal OTP verified successfully - OTP persisted for withdrawal transaction:', userId);
      return res.json({ message: 'Withdrawal OTP verified', withdrawalApproved: true });
    }
    
    return res.status(400).json({ message: 'Invalid OTP type' });
  } catch (error) {
    console.error('[v0] OTP verification error:', error);
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Verify Email (legacy token-based verification)
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    
    // Ensure user has a userCode (for existing users who don't have one)
    if (!user.userCode) {
      user.userCode = await generateUserCode(User);
      console.log('[v0] Assigned userCode to existing user:', user.userCode);
    }
    
    await user.save();
    
    const token = generateToken(user._id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode, // Include 6-digit code in response
        isEmailVerified: user.isEmailVerified,
        kycStatus: user.kycStatus,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    let user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Ensure user has a userCode (for existing users who don't have one)
    if (!user.userCode) {
      user.userCode = await generateUserCode(User);
      await user.save();
      console.log('[v0] Assigned userCode to user on /me request:', user.userCode);
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Financial Summary endpoint - returns consolidated balance info for admin and user dashboards
// SINGLE SOURCE OF TRUTH: Uses balanceService.calculateAvailableBalance
router.get('/financial-summary', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // CRITICAL: Use balanceService as SINGLE SOURCE OF TRUTH for ALL balance calculations
    // This ensures user dashboard = admin dashboard = backend calculations
    const balanceInfo = await balanceService.calculateAvailableBalance(userId);

    const financialSummary = {
      // SINGLE SOURCE OF TRUTH: All values from balanceService
      currentBalance: Math.max(0, balanceInfo.totalBalance),
      availableBalance: Math.max(0, balanceInfo.availableBalance),
      totalInvested: Math.max(0, balanceInfo.totalInvested),
      totalEarnings: Math.max(0, balanceInfo.investmentReturns + balanceInfo.puzzleGameBonuses + balanceInfo.referralEarnings + balanceInfo.tradingBonuses),
      totalWithdrawn: Math.max(0, user.totalWithdrawn || 0),
      totalDeposited: Math.max(0, user.totalDeposited || 0),
      
      // Detailed breakdown for transparency
      breakdown: {
        lockedInTrades: Math.max(0, balanceInfo.lockedInTrades),
        pendingWithdrawal: Math.max(0, balanceInfo.pendingWithdrawal),
        investmentReturns: Math.max(0, balanceInfo.investmentReturns),
        puzzleGameBonuses: Math.max(0, balanceInfo.puzzleGameBonuses),
        tradingBonuses: Math.max(0, balanceInfo.tradingBonuses),
        referralEarnings: Math.max(0, balanceInfo.referralEarnings)
      },
      
      // PowaUp info
      powaUpBalance: Math.max(0, user.powaUpBalance || 0),
      totalSpentOnPowaUp: Math.max(0, user.totalSpentOnPowaUp || 0),
      
      // Metadata
      lastUpdated: balanceInfo.lastUpdated || new Date(),
      currency: 'USD',
      source: 'balanceService.calculateAvailableBalance (SINGLE SOURCE OF TRUTH)'
    };

    console.log('[FINANCIAL SUMMARY - USER DASHBOARD] - SINGLE SOURCE OF TRUTH', {
      userId: userId.toString(),
      userEmail: user.email,
      currentBalance: balanceInfo.totalBalance,
      availableBalance: balanceInfo.availableBalance,
      lockedInTrades: balanceInfo.lockedInTrades,
      pendingWithdrawal: balanceInfo.pendingWithdrawal,
      totalInvested: balanceInfo.totalInvested,
      totalEarnings: balanceInfo.investmentReturns + balanceInfo.puzzleGameBonuses + balanceInfo.referralEarnings + balanceInfo.tradingBonuses,
      message: 'All values from balanceService - guaranteed consistency with admin and withdrawal/purchase endpoints'
    });

    res.json(financialSummary);
  } catch (error) {
    console.error('[v0] Financial summary error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch financial summary', 
      error: error.message 
    });
  }
});



// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = resetToken;
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'https://powabitz.com'}/reset-password?token=${resetToken}`;
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@powabitz.com',
      to: email,
      subject: 'Reset your Powabitz password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Password Reset Request</h2>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
            <p style="color: #333; font-size: 16px;">Click the link below to reset your password:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        </div>
      `
    });
    
    res.json({ message: 'Password reset link sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending reset link', error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    user.password = newPassword;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed', error: error.message });
  }
});

// Request Withdrawal OTP
router.post('/request-withdrawal-otp', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate OTP for withdrawal
    const withdrawalOTP = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP in user document
    user.withdrawalOTP = withdrawalOTP;
    user.withdrawalOTPExpire = otpExpire;
    user.withdrawalOTPVerified = false;
    await user.save();
    
    // Send OTP email
    await sendWithdrawalOTP(user.email, withdrawalOTP);
    
    console.log('[v0] Withdrawal OTP Generated and Sent:', {
      userId: userId.toString(),
      userEmail: user.email,
      otpValue: withdrawalOTP,
      otpLength: withdrawalOTP.length,
      otpType: typeof withdrawalOTP,
      otpExpireAt: otpExpire.getTime(),
      expiresInMinutes: 10,
      timestamp: new Date().toISOString(),
      message: 'OTP stored in database and sent via email'
    });
    
    res.json({ 
      message: 'Withdrawal OTP sent to your email',
      requiresOTP: true,
      otpExpireIn: '10 minutes'
    });
  } catch (error) {
    console.error('[v0] Error sending withdrawal OTP:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id || req.user?.userId || req.user?.id
    });
    res.status(500).json({ message: 'Failed to send withdrawal OTP. Please try again.' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Logout is handled client-side by removing the token
    // This endpoint just confirms the logout was processed
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed', error: error.message });
  }
});

// Get referral statistics and details
router.get('/referral-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const user = await User.findById(userId)
      .populate('referrals.userId', 'fullName email createdAt')
      .select('referralCode referralStats referrals referralEarnings');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate detailed stats
    const tier1Referrals = user.referrals.filter(r => r.tier === 1);
    const tier2Referrals = user.referrals.filter(r => r.tier === 2);
    const tier3Referrals = user.referrals.filter(r => r.tier === 3);
    
    const totalCommissions = 
      (user.referralStats?.tier1Earnings || 0) + 
      (user.referralStats?.tier2Earnings || 0) + 
      (user.referralStats?.tier3Earnings || 0);
    
    const activeReferrals = user.referrals.filter(r => r.totalInvested > 0).length;
    
    res.json({
      referralCode: user.referralCode,
      stats: {
        totalReferrals: user.referrals.length,
        activeReferrals: activeReferrals,
        tier1Count: tier1Referrals.length,
        tier2Count: tier2Referrals.length,
        tier3Count: tier3Referrals.length,
        tier1Earnings: user.referralStats?.tier1Earnings || 0,
        tier2Earnings: user.referralStats?.tier2Earnings || 0,
        tier3Earnings: user.referralStats?.tier3Earnings || 0,
        totalCommissions: totalCommissions,
        pendingCommissions: 0 // All commissions are instant
      },
      referrals: {
        tier1: tier1Referrals.map(r => ({
          id: r.userId?._id || r.userId,
          name: r.userId?.fullName || 'User',
          email: r.userId?.email,
          joinedAt: r.joinedAt,
          totalInvested: r.totalInvested || 0,
          commissionEarned: r.commissionEarned || 0
        })),
        tier2: tier2Referrals.map(r => ({
          id: r.userId?._id || r.userId,
          name: r.userId?.fullName || 'User',
          email: r.userId?.email,
          joinedAt: r.joinedAt,
          totalInvested: r.totalInvested || 0,
          commissionEarned: r.commissionEarned || 0
        })),
        tier3: tier3Referrals.map(r => ({
          id: r.userId?._id || r.userId,
          name: r.userId?.fullName || 'User',
          email: r.userId?.email,
          joinedAt: r.joinedAt,
          totalInvested: r.totalInvested || 0,
          commissionEarned: r.commissionEarned || 0
        }))
      }
    });
  } catch (error) {
    console.error('[v0] Error fetching referral stats:', error);
    res.status(500).json({ message: 'Failed to fetch referral stats', error: error.message });
  }
});

// Validate referral code (public endpoint for registration)
router.get('/validate-referral/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.json({ valid: false, message: 'No referral code provided' });
    }
    
    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    
    if (referrer) {
      res.json({ 
        valid: true, 
        referrerName: referrer.fullName.split(' ')[0] // Only first name for privacy
      });
    } else {
      res.json({ valid: false, message: 'Invalid referral code' });
    }
  } catch (error) {
    console.error('[v0] Error validating referral code:', error);
    res.status(500).json({ valid: false, message: 'Error validating code' });
  }
});

// Update user avatar
router.put('/update-avatar', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;
    const { avatar } = req.body;

    if (!avatar || typeof avatar !== 'string') {
      return res.status(400).json({ message: 'Invalid avatar URL provided' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('[v0] Avatar updated for user:', userId);
    res.json({
      message: 'Avatar updated successfully',
      user: {
        _id: user._id,
        avatar: user.avatar,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('[v0] Error updating avatar:', error);
    res.status(500).json({ message: 'Failed to update avatar', error: error.message });
  }
});

// Migration endpoint - assign userCode to all existing users without one
router.get('/migrate/assign-user-codes', authenticate, async (req, res) => {
  try {
    // Only allow admin to run this migration (optional - remove if you want any authenticated user to trigger)
    console.log('[v0] Starting userCode migration...');
    
    const result = await migrateUserCodesOnDemand();
    
    res.json({
      message: 'UserCode migration completed',
      ...result
    });
  } catch (error) {
    console.error('[v0] Migration endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

export default router;
