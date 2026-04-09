import express from 'express';
import { authenticate } from '../middleware/auth.js';
import WalletAddress from '../models/WalletAddress.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

// Get all wallet addresses for authenticated user (root endpoint)
router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query; // Optional type filter: 'bank_account' or 'crypto'
    
    const query = { userId: req.user.id };
    if (type) {
      query.type = type;
    }
    
    const wallets = await WalletAddress.find(query)
      .sort({ isDefault: -1, addedAt: -1 });

    res.json({
      message: 'User wallet addresses',
      data: wallets,
      total: wallets.length
    });
  } catch (error) {
    console.error('[v0] Get wallet addresses error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet addresses' });
  }
});

// Configure email service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Add wallet address (POST to root endpoint - no /add suffix needed)
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, accountHolder, accountNumber, bankName, walletAddress, walletType } = req.body;

    // Support both bank account and crypto wallet formats
    if (type === 'bank_account') {
      // Bank account validation
      if (!accountHolder || !accountNumber || !bankName) {
        return res.status(400).json({ message: 'Account holder, number, and bank name are required' });
      }

      // Check if bank account already exists for this user
      const existing = await WalletAddress.findOne({
        userId: req.user.id,
        accountNumber: accountNumber,
        type: 'bank_account'
      });

      if (existing) {
        return res.status(400).json({ message: 'This bank account is already added' });
      }

      const account = new WalletAddress({
        userId: req.user.id,
        type: 'bank_account',
        accountHolder,
        accountNumber,
        bankName,
        currency: 'NGN',
        status: 'active'
      });

      await account.save();

      console.log('[v0] Bank account added:', account._id);
      
      return res.status(201).json({
        message: 'Bank account added successfully',
        data: {
          _id: account._id,
          accountHolder: account.accountHolder,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          currency: account.currency,
          status: account.status,
          addedAt: account.addedAt
        }
      });
    } else {
      // Crypto wallet format (backwards compatibility)
      if (!walletAddress || !walletType) {
        return res.status(400).json({ message: 'Wallet address and type are required' });
      }

      if (walletAddress.length < 10) {
        return res.status(400).json({ message: 'Invalid wallet address format' });
      }

      const existing = await WalletAddress.findOne({
        userId: req.user.id,
        walletAddress: walletAddress.toLowerCase(),
        type: 'crypto'
      });

      if (existing) {
        return res.status(400).json({ message: 'This wallet address is already added' });
      }

      const count = await WalletAddress.countDocuments({ userId: req.user.id, type: 'crypto' });
      const isDefault = count === 0;

      const wallet = new WalletAddress({
        userId: req.user.id,
        type: 'crypto',
        walletAddress: walletAddress.toLowerCase(),
        walletType,
        isDefault
      });

      await wallet.save();

      return res.status(201).json({
        message: 'Wallet address added successfully',
        data: {
          _id: wallet._id,
          walletAddress: wallet.walletAddress,
          walletType: wallet.walletType,
          isDefault: wallet.isDefault,
          addedAt: wallet.addedAt
        }
      });
    }
  } catch (error) {
    console.error('[v0] Add wallet error:', error);
    res.status(500).json({ message: error.message || 'Failed to add wallet address' });
  }
});

// Get all wallet addresses for user
router.get('/my-wallets', authenticate, async (req, res) => {
  try {
    const wallets = await WalletAddress.find({ userId: req.user.id })
      .sort({ isDefault: -1, addedAt: -1 });

    res.json({
      message: 'User wallet addresses',
      total: wallets.length,
      wallets
    });
  } catch (error) {
    console.error('[v0] Get wallets error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet addresses' });
  }
});

// Get default wallet
router.get('/default', authenticate, async (req, res) => {
  try {
    const wallet = await WalletAddress.findOne({
      userId: req.user.id,
      isDefault: true
    });

    if (!wallet) {
      return res.json({
        message: 'No default wallet set',
        wallet: null
      });
    }

    res.json({
      message: 'Default wallet address',
      wallet
    });
  } catch (error) {
    console.error('[v0] Get default wallet error:', error);
    res.status(500).json({ message: 'Failed to fetch default wallet' });
  }
});

// Set default wallet
router.put('/set-default/:walletId', authenticate, async (req, res) => {
  try {
    const { walletId } = req.params;

    // Check if wallet belongs to user
    const wallet = await WalletAddress.findOne({
      _id: walletId,
      userId: req.user.id
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Remove default from all user's wallets
    await WalletAddress.updateMany(
      { userId: req.user.id },
      { isDefault: false }
    );

    // Set new default
    wallet.isDefault = true;
    await wallet.save();

    res.json({
      message: 'Default wallet set successfully',
      wallet
    });
  } catch (error) {
    console.error('[v0] Set default wallet error:', error);
    res.status(500).json({ message: 'Failed to set default wallet' });
  }
});

// Delete wallet address
router.delete('/delete/:walletId', authenticate, async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await WalletAddress.findOne({
      _id: walletId,
      userId: req.user.id
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Don't delete if it's the only wallet
    const count = await WalletAddress.countDocuments({ userId: req.user.id });
    if (count === 1) {
      return res.status(400).json({ message: 'Cannot delete your only wallet address' });
    }

    await WalletAddress.findByIdAndDelete(walletId);

    // If deleted wallet was default, set another as default
    if (wallet.isDefault) {
      const newDefault = await WalletAddress.findOne({ userId: req.user.id });
      if (newDefault) {
        newDefault.isDefault = true;
        await newDefault.save();
      }
    }

    res.json({
      message: 'Wallet address deleted successfully'
    });
  } catch (error) {
    console.error('[v0] Delete wallet error:', error);
    res.status(500).json({ message: 'Failed to delete wallet address' });
  }
});

// Admin: Get all wallet addresses
router.get('/admin/all-wallets', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const wallets = await WalletAddress.find()
      .populate('userId', 'email phone balance')
      .sort({ addedAt: -1 })
      .limit(1000);

    res.json({
      message: 'All wallet addresses',
      total: wallets.length,
      data: wallets
    });
  } catch (error) {
    console.error('[v0] Admin wallets fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet addresses' });
  }
});

export default router;
