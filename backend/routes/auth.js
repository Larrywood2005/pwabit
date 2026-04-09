import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import { authenticate } from '../middleware/auth.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

// Configure email service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Powabitz - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Powabitz!</h2>
          <p>Your email verification code is:</p>
          <h3 style="background: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 2px; font-size: 24px; color: #333;">
            ${otp}
          </h3>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p style="color: #999; font-size: 12px;">Powabitz Support | support@powabitz.com</p>
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
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Powabitz - Withdrawal Security Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Withdrawal Request</h2>
          <p>You have requested a withdrawal. Your security code is:</p>
          <h3 style="background: #f0f0f0; padding: 15px; text-align: center; letter-spacing: 2px; font-size: 24px; color: #333;">
            ${otp}
          </h3>
          <p style="color: #d32f2f;"><strong>This code expires in 10 minutes.</strong></p>
          <p>If you didn't request this withdrawal, contact support immediately.</p>
          <hr>
          <p style="color: #999; font-size: 12px;">Powabitz Support | support@powabitz.com</p>
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
    const { fullName, email, password, phone } = req.body;
    
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
    
    // Create user with OTP
    const user = new User({
      fullName,
      email,
      password,
      phone,
      emailVerificationOTP: verificationOTP,
      emailVerificationExpire: otpExpire,
      emailVerified: false
    });
    
    await user.save();
    
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
      // Withdrawal OTP verification
      if (user.withdrawalOTPExpire && user.withdrawalOTPExpire < Date.now()) {
        return res.status(400).json({ message: 'OTP has expired. Please request a new withdrawal.' });
      }
      
      if (user.withdrawalOTP !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      // Mark OTP as verified for this session
      user.withdrawalOTPVerified = true;
      user.withdrawalOTP = undefined;
      user.withdrawalOTPExpire = undefined;
      await user.save();
      
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
    await user.save();
    
    const token = generateToken(user._id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
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
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
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
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset your Powabitz password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 24 hours.</p>
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
    
    console.log('[v0] Withdrawal OTP sent to:', user.email);
    
    res.json({ 
      message: 'Withdrawal OTP sent to your email',
      requiresOTP: true,
      otpExpireIn: '10 minutes'
    });
  } catch (error) {
    console.error('[v0] Error sending withdrawal OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
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

export default router;
