import express from 'express';
import { authenticate } from '../middleware/auth.js';
import WalletAddress from '../models/WalletAddress.js';

const router = express.Router();

// Socket.io instance will be injected via middleware
export const setSocketIO = (io) => {
  router.io = io;
};

// Get all wallet addresses for authenticated user (root endpoint)
router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query; // Optional type filter: 'bank_account' or 'crypto'
    
    const userId = req.user.userId || req.user._id || req.user.id;
    const query = { userId };
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

// Add wallet address (POST to root endpoint)
router.post('/', authenticate, async (req, res) => {
  try {
    const { walletAddress, walletType, usdtNetwork } = req.body;
    const userId = req.user.userId || req.user._id || req.user.id;

    // Crypto wallet validation
    if (!walletAddress || !walletType) {
      return res.status(400).json({ message: 'Wallet address and type are required' });
    }

    if (walletAddress.length < 10) {
      return res.status(400).json({ message: 'Invalid wallet address format' });
    }

    // Check if wallet already exists for this user
    const existing = await WalletAddress.findOne({
      userId,
      walletAddress: walletAddress.toLowerCase()
    });

    if (existing) {
      return res.status(400).json({ message: 'This wallet address is already added' });
    }

    // First wallet is default
    const count = await WalletAddress.countDocuments({ userId });
    const isDefault = count === 0;

    const wallet = new WalletAddress({
      userId,
      walletAddress: walletAddress.toLowerCase(),
      walletType,
      usdtNetwork: walletType === 'usdt' ? (usdtNetwork || 'bep20') : null,
      isDefault
    });

    await wallet.save();

    // Emit Socket.io event for real-time update
    if (router.io) {
      const roomId = `user_${userId}`;
      router.io.to(roomId).emit('wallet-added', {
        _id: wallet._id,
        walletAddress: wallet.walletAddress,
        walletType: wallet.walletType,
        usdtNetwork: wallet.usdtNetwork,
        isDefault: wallet.isDefault,
        addedAt: wallet.addedAt
      });
      console.log(`[Socket.io] Wallet added event emitted to room: ${roomId}`);
    }

    return res.status(201).json({
      message: 'Wallet address added successfully',
      data: {
        _id: wallet._id,
        walletAddress: wallet.walletAddress,
        walletType: wallet.walletType,
        usdtNetwork: wallet.usdtNetwork,
        isDefault: wallet.isDefault,
        addedAt: wallet.addedAt
      }
    });
  } catch (error) {
    console.error('[v0] Add wallet error:', error);
    res.status(500).json({ message: error.message || 'Failed to add wallet address' });
  }
});

// Get all wallet addresses for user
router.get('/my-wallets', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const wallets = await WalletAddress.find({ userId })
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
    const userId = req.user.userId || req.user._id || req.user.id;
    const wallet = await WalletAddress.findOne({
      userId,
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
    const userId = req.user.userId || req.user._id || req.user.id;

    // Check if wallet belongs to user
    const wallet = await WalletAddress.findOne({
      _id: walletId,
      userId
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Remove default from all user's wallets
    await WalletAddress.updateMany(
      { userId },
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
    const userId = req.user.userId || req.user._id || req.user.id;

    const wallet = await WalletAddress.findOne({
      _id: walletId,
      userId
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Don't delete if it's the only wallet
    const count = await WalletAddress.countDocuments({ userId });
    if (count === 1) {
      return res.status(400).json({ message: 'Cannot delete your only wallet address' });
    }

    await WalletAddress.findByIdAndDelete(walletId);

    // If deleted wallet was default, set another as default
    if (wallet.isDefault) {
      const newDefault = await WalletAddress.findOne({ userId });
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
