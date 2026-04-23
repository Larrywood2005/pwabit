import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { authenticate } from '../middleware/auth.js';
import balanceService from '../services/balanceService.js';

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
    const userId = req.user.userId || req.user._id;
    
    // Validate request body
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid PowaUp amount' });
    }
    
    // Validate user exists
    let user;
    try {
      user = await User.findById(userId);
    } catch (dbError) {
      console.error('[v0] PowaUp purchase - Database error finding user:', dbError);
      return res.status(500).json({ message: 'Failed to retrieve user information' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const cost = amount * POWAUP_PRICE;
    
    // Get accurate balance information with proper error handling
    let balanceInfo;
    try {
      balanceInfo = await balanceService.calculateAvailableBalance(userId);
    } catch (balanceError) {
      console.error('[v0] PowaUp purchase - Error calculating balance:', {
        userId,
        error: balanceError.message,
        stack: balanceError.stack
      });
      return res.status(500).json({ message: 'Failed to calculate available balance' });
    }
    
    // Validate balanceInfo response
    if (!balanceInfo || typeof balanceInfo.availableBalance !== 'number') {
      console.error('[v0] PowaUp purchase - Invalid balance info structure:', balanceInfo);
      return res.status(500).json({ message: 'Invalid balance information received' });
    }
    
    const availableBalance = Math.max(0, balanceInfo.availableBalance);
    const currentBalance = user.currentBalance || 0;
    
    // BALANCE DEBUG LOG - PowaUp purchase check using availableBalance as SINGLE SOURCE OF TRUTH
    console.log('[BALANCE DEBUG - POWAUP PURCHASE]', {
      userId: userId.toString(),
      userEmail: user.email,
      availableBalance: availableBalance,
      currentBalance: currentBalance,
      totalBalance: balanceInfo.totalBalance,
      powaUpAmount: amount,
      requiredCost: cost,
      canAfford: availableBalance >= cost,
      lockedInTrades: balanceInfo.lockedInTrades,
      pendingWithdrawal: balanceInfo.pendingWithdrawal,
      message: 'SINGLE SOURCE OF TRUTH: availableBalance'
    });
    
    // Use AVAILABLE balance for PowaUp purchases - this is the true accessible balance
    // availableBalance = currentBalance - locked - pending
    if (availableBalance < cost) {
      console.log('[v0] PowaUp purchase - Insufficient available balance:', {
        userId,
        availableBalance,
        cost,
        currentBalance,
        lockedInTrades: balanceInfo.lockedInTrades,
        pendingWithdrawal: balanceInfo.pendingWithdrawal,
        shortfall: cost - availableBalance
      });
      return res.status(400).json({ 
        message: `Insufficient available balance for purchase. You need $${cost.toFixed(2)} but have $${availableBalance.toFixed(2)} available.`,
        requiredBalance: cost,
        availableBalance: availableBalance,
        currentBalance: currentBalance,
        lockedInTrades: balanceInfo.lockedInTrades,
        pendingWithdrawal: balanceInfo.pendingWithdrawal,
        shortfall: Math.max(0, cost - availableBalance)
      });
    }
    
    // Use balanceService for purchase to ensure consistency
    // CRITICAL: balanceService.updateBalanceOnPowaUpPurchase is the ONLY place where balance is modified
    // This ensures single source of truth and prevents balance double-updates
    let purchaseResult;
    try {
      purchaseResult = await balanceService.updateBalanceOnPowaUpPurchase(
        userId,
        amount,
        cost,
        {
          pricePerPowaUp: POWAUP_PRICE
        }
      );
    } catch (purchaseError) {
      console.error('[v0] PowaUp purchase - Service error:', {
        userId,
        amount,
        cost,
        error: purchaseError.message,
        stack: purchaseError.stack
      });
      // Return appropriate error based on service response
      if (purchaseError.message.includes('Insufficient')) {
        return res.status(400).json({ message: purchaseError.message });
      }
      if (purchaseError.message.includes('not found')) {
        return res.status(404).json({ message: purchaseError.message });
      }
      return res.status(500).json({ message: 'Failed to process PowaUp purchase' });
    }
    
    // Add to PowaUp history
    try {
      user = await User.findById(userId);
      if (user && user.powaUpHistory) {
        user.powaUpHistory.push({
          type: 'purchased',
          amount: amount,
          cost: cost,
          reason: `Purchased ${amount} PowaUp at $${POWAUP_PRICE} each`,
          transactionId: purchaseResult.transactionId,
          timestamp: new Date()
        });
        await user.save();
      }
    } catch (historyError) {
      console.error('[v0] PowaUp purchase - Error adding history:', {
        userId,
        error: historyError.message
      });
      // Don't fail the request, history is non-critical
    }
    
    // Get updated balance info after purchase
    let updatedBalanceInfo;
    try {
      updatedBalanceInfo = await balanceService.calculateAvailableBalance(userId);
    } catch (updateError) {
      console.error('[v0] PowaUp purchase - Error fetching updated balance:', {
        userId,
        error: updateError.message
      });
      // Use fallback values based on purchase result
      updatedBalanceInfo = {
        totalBalance: purchaseResult.newBalance,
        availableBalance: purchaseResult.newBalance - (balanceInfo.lockedInTrades || 0) - (balanceInfo.pendingWithdrawal || 0)
      };
    }
    
    console.log('[BALANCE FINAL CHECK - POWAUP PURCHASE]', { 
      userId: userId.toString(), 
      amount,
      cost,
      balanceBefore: balanceInfo.availableBalance + Math.max(0, balanceInfo.lockedInTrades) + Math.max(0, balanceInfo.pendingWithdrawal),
      availableBalanceBefore: balanceInfo.availableBalance,
      newBalance: purchaseResult.newBalance,
      newPowaUpBalance: purchaseResult.newPowaUpBalance,
      transactionId: purchaseResult.transactionId,
      message: 'PowaUp purchase from availableBalance - SINGLE SOURCE OF TRUTH'
    });
    
    res.status(200).json({
      message: `Successfully purchased ${amount} PowaUp`,
      powaUpBalance: purchaseResult.newPowaUpBalance,
      newBalance: updatedBalanceInfo.totalBalance,
      availableBalance: updatedBalanceInfo.availableBalance,
      totalBalance: updatedBalanceInfo.totalBalance,
      transactionId: purchaseResult.transactionId
    });
  } catch (error) {
    console.error('[v0] PowaUp purchase - Unexpected error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId || req.user?._id
    });
    res.status(500).json({ message: 'Failed to purchase PowaUp' });
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
