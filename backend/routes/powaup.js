import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authenticate } from '../middleware/auth.js';
import balanceService from '../services/balanceService.js';
import userBalanceService from '../services/userBalanceService.js';

const router = express.Router();

const POWAUP_PRICE = 0.30; // $0.30 per PowaUp
const INITIAL_POWAUP = 30; // Initial free PowaUp for new users

// Get user's PowaUp balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id).select('powaUpBalance powaUpSpent powaUpHistory totalPowaUpPurchased');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      powaUpBalance: user.powaUpBalance,
      powaUpSpent: user.powaUpSpent,
      totalPowaUpPurchased: user.totalPowaUpPurchased,
      historyCount: user.powaUpHistory.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch PowaUp balance', error: error.message });
  }
});

// Get PowaUp history
router.get('/history', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id).select('powaUpHistory');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.powaUpHistory.sort((a, b) => b.timestamp - a.timestamp));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch PowaUp history', error: error.message });
  }
});

// Purchase PowaUp
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid PowaUp amount' });
    }
    
    const cost = amount * POWAUP_PRICE;
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate balance using PowaUp-specific validation (only checks current balance, not locked funds)
    const validation = await userBalanceService.validatePowaUpPurchase(userId, cost);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: validation.reason,
        requiredBalance: cost,
        currentBalance: validation.currentBalance
      });
    }
    
    // Process purchase using balance service
    const purchaseResult = await userBalanceService.purchasePowaUp(userId, amount, cost);
    
    // Update PowaUp balance in user document
    const updatedUser = await User.findById(userId);
    updatedUser.powaUpHistory.push({
      type: 'purchased',
      amount: amount,
      cost: cost,
      reason: `Purchased ${amount} PowaUp at $${POWAUP_PRICE} each`,
      transactionId: purchaseResult.transactionId,
      timestamp: new Date()
    });
    await updatedUser.save();
    
    // Get updated balance info
    const balanceInfo = await balanceService.calculateAvailableBalance(userId);
    
    console.log('[v0] PowaUp purchase successful:', { userId, amount, cost, transactionId: purchaseResult.transactionId });
    
    res.json({
      message: `Successfully purchased ${amount} PowaUp`,
      powaUpBalance: purchaseResult.newPowaUpBalance,
      newBalance: purchaseResult.newBalance,
      availableBalance: balanceInfo.availableBalance,
      transactionId: purchaseResult.transactionId
    });
  } catch (error) {
    console.error('[v0] PowaUp purchase error:', error);
    res.status(500).json({ message: 'Failed to purchase PowaUp', error: error.message });
  }
});

// Use PowaUp for trading (called when user trades)
router.post('/use', authenticate, async (req, res) => {
  try {
    const { amount, tradeId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid PowaUp amount' });
    }
    
    const user = await User.findById(req.user.userId || req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has sufficient PowaUp
    if (user.powaUpBalance < amount) {
      return res.status(400).json({
        message: 'Insufficient PowaUp balance',
        requiredPowaUp: amount,
        currentBalance: user.powaUpBalance
      });
    }
    
    // Deduct PowaUp
    user.powaUpBalance -= amount;
    user.powaUpSpent += amount;
    
    // Add to history
    user.powaUpHistory.push({
      type: 'used',
      amount: amount,
      reason: `Used for trading`,
      transactionId: tradeId
    });
    
    await user.save();
    
    console.log('[v0] PowaUp used:', { userId: user._id, amount, tradeId });
    
    res.json({
      message: `Used ${amount} PowaUp for trading`,
      powaUpBalance: user.powaUpBalance,
      powaUpSpent: user.powaUpSpent
    });
  } catch (error) {
    console.error('[v0] PowaUp use error:', error);
    res.status(500).json({ message: 'Failed to use PowaUp', error: error.message });
  }
});

// Get PowaUp pricing info (public endpoint)
router.get('/pricing', (req, res) => {
  res.json({
    pricePerUnit: POWAUP_PRICE,
    initialFreePowaUp: INITIAL_POWAUP,
    description: 'PowaUp is required to trade. Get 30 free on signup, then $0.30 per additional unit.'
  });
});

export default router;
