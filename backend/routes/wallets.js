import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { getWalletAddresses } from '../config/wallets.js';

const router = express.Router();

// Get Powabitz company wallet addresses (public endpoint)
router.get('/company-addresses', (req, res) => {
  try {
    const addresses = getWalletAddresses();
    res.json({
      message: 'Powabitz company wallet addresses',
      wallets: addresses,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch company addresses', error: error.message });
  }
});

// Get user wallet
router.get('/my-wallet', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wallet', error: error.message });
  }
});

// Get deposit addresses
router.get('/deposit-addresses', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.json({
      addresses: wallet.depositAddresses,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch addresses', error: error.message });
  }
});

// Update custom wallet address
router.post('/add-custom-address', authenticate, async (req, res) => {
  try {
    const { name, address, network } = req.body;
    
    if (!name || !address || !network) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const user = await User.findById(req.user.userId);
    
    user.walletAddresses.custom.push({
      name,
      address,
      network
    });
    
    await user.save();
    
    res.json({ message: 'Address added successfully', wallets: user.walletAddresses });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add address', error: error.message });
  }
});

// Get custom addresses
router.get('/custom-addresses', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json(user.walletAddresses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch addresses', error: error.message });
  }
});

// Get wallet balance history
router.get('/history', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    res.json({
      balances: wallet.balances,
      pendingDeposits: wallet.pendingDeposits,
      withdrawalHistory: wallet.withdrawalHistory.slice(-20) // Last 20
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch history', error: error.message });
  }
});

// Get wallet balances (for wallet page)
router.get('/balances', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      // Return default balances if wallet doesn't exist yet
      return res.json([
        { currency: 'BTC', balance: 0, usdValue: 0 },
        { currency: 'ETH', balance: 0, usdValue: 0 },
        { currency: 'USDT', balance: 0, usdValue: 0 }
      ]);
    }
    
    // Transform wallet balances from object format to array
    const balances = [
      { currency: 'BTC', balance: wallet.balances.btc || 0, usdValue: 0 },
      { currency: 'ETH', balance: wallet.balances.eth || 0, usdValue: 0 },
      { currency: 'USDT', balance: wallet.balances.usdt || 0, usdValue: 0 },
      { currency: 'LTC', balance: wallet.balances.ltc || 0, usdValue: 0 },
      { currency: 'DOGE', balance: wallet.balances.doge || 0, usdValue: 0 }
    ];
    
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch balances', error: error.message });
  }
});

// Get wallet transactions (for wallet page)
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      return res.json({
        data: [],
        pagination: { page, limit, total: 0 }
      });
    }
    
    // Combine pending deposits and withdrawal history
    const allTransactions = [
      ...wallet.pendingDeposits.map(tx => ({ 
        type: 'deposit',
        currency: tx.currency,
        amount: tx.amount,
        status: 'pending',
        transactionHash: tx.transactionHash,
        timestamp: tx.createdAt || new Date()
      })),
      ...wallet.withdrawalHistory.map(tx => ({ 
        ...tx.toObject(),
        type: 'withdrawal'
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const total = allTransactions.length;
    const transactions = allTransactions.slice(skip, skip + limit);
    
    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

// Get user wallet info (alias for /my-wallet but returns consistent format)
router.get('/me', authenticate, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    const user = await User.findById(req.user.userId);
    
    if (!wallet) {
      return res.json({
        userId: req.user.userId,
        totalBalance: user?.currentBalance || 0,
        walletAddress: user?.walletAddresses?.btc || null,
        currencies: {
          btc: 0,
          eth: 0,
          usdt: 0,
          ltc: 0,
          doge: 0
        },
        depositAddresses: {},
        pendingDeposits: []
      });
    }
    
    res.json({
      userId: req.user.userId,
      totalBalance: wallet.usdEquivalent || 0,
      walletAddress: wallet.depositAddresses?.btc || null,
      currencies: wallet.balances,
      depositAddresses: wallet.depositAddresses,
      pendingDeposits: wallet.pendingDeposits
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wallet info', error: error.message });
  }
});

export default router;
