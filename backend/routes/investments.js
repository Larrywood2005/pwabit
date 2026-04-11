import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Investment packages
const packages = {
  starter: { name: 'Starter', minAmount: 10, maxAmount: 999, dailyReturn: 5 },
  premium: { name: 'Premium', minAmount: 1000, maxAmount: 4999, dailyReturn: 5 },
  elite: { name: 'Elite', minAmount: 5000, maxAmount: null, dailyReturn: 5 }
};

// Create investment
router.post('/', authenticate, async (req, res) => {
  try {
    const { packageId, amount } = req.body;
    const userId = req.user.userId;
    
    // Validate package and amount
    const pkg = packages[packageId];
    if (!pkg) {
      return res.status(400).json({ message: 'Invalid package' });
    }
    
    if (amount < pkg.minAmount) {
      return res.status(400).json({ message: `Minimum investment is $${pkg.minAmount}` });
    }
    
    if (pkg.maxAmount && amount > pkg.maxAmount) {
      return res.status(400).json({ message: `Maximum investment is $${pkg.maxAmount}` });
    }
    
    // Create investment
    const investment = new Investment({
      userId,
      packageId,
      packageName: pkg.name,
      amount,
      dailyReturnPercent: pkg.dailyReturn
    });
    
    await investment.save();
    
    // Create pending transaction
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount,
      investmentId: investment._id,
      status: 'pending'
    });
    
    await transaction.save();
    
    res.status(201).json({
      message: 'Investment created. Awaiting deposit confirmation.',
      investment,
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create investment', error: error.message });
  }
});

// Get user investments with pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const investments = await Investment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Investment.countDocuments({ userId: req.user.userId });
    
    res.json({
      data: investments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch investments', error: error.message });
  }
});

// Get investment details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    res.json(investment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch investment', error: error.message });
  }
});

// Trade (place trade after 24h)
router.post('/:id/trade', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: 'active'
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found or not active' });
    }
    
    // Get user to check PowaUp balance
    const User = await import('../models/User.js').then(m => m.default);
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has PowaUp (minimum 1 required for trading)
    if (user.powaUpBalance < 1) {
      return res.status(400).json({ 
        message: 'Insufficient PowaUp to trade. Required: 1 PowaUp, Your balance: ' + user.powaUpBalance,
        requiredPowaUp: 1,
        currentPowaUp: user.powaUpBalance
      });
    }
    
    // Check if already trading
    if (investment.tradeInProgress) {
      return res.status(400).json({ message: 'A trade is already in progress for this investment' });
    }
    
    // Check if there's a cooldown between trades (only check lastTradedAt)
    const now = Date.now();
    if (investment.lastTradedAt) {
      const hoursSinceLastTrade = (now - investment.lastTradedAt) / (1000 * 60 * 60);
      if (hoursSinceLastTrade < 24) {
        return res.status(400).json({ 
          message: `Can trade again in ${Math.ceil(24 - hoursSinceLastTrade)} hours` 
        });
      }
    }
    // No waiting period after activation - users can trade immediately once investment is active
    
    // Lock the amount and start trade
    const tradeStartTime = new Date();
    const tradeEndTime = new Date(tradeStartTime.getTime() + 24 * 60 * 60 * 1000); // 24h from now
    
    investment.lockedAmount = investment.amount;
    investment.tradeInProgress = true;
    investment.tradeStartTime = tradeStartTime;
    investment.tradeEndTime = tradeEndTime;
    investment.lastTradedAt = tradeStartTime;
    investment.tradingCount += 1;
    
    // Add to trade history
    investment.tradeHistory.push({
      startTime: tradeStartTime,
      endTime: tradeEndTime,
      lockedAmount: investment.amount,
      status: 'active'
    });
    
    await investment.save();
    
    // Deduct 1 PowaUp from user balance for the trade
    user.powaUpBalance -= 1;
    user.powaUpSpent += 1;
    user.powaUpHistory.push({
      type: 'used',
      amount: 1,
      reason: `Used for trading investment ${investment._id}`,
      transactionId: investment._id,
      timestamp: tradeStartTime
    });
    await user.save();
    
    res.json({ 
      message: 'Trade placed successfully! Your funds are locked.', 
      investment,
      tradeEndTime,
      lockedAmount: investment.amount,
      powaUpBalance: user.powaUpBalance
    });
  } catch (error) {
    console.error('[v0] Trade error:', error);
    res.status(500).json({ message: 'Failed to place trade', error: error.message });
  }
});

// Complete trade (called after 24h) - applies profit and unlocks funds
router.post('/:id/trade/complete', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: 'active'
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found or not active' });
    }
    
    if (!investment.tradeInProgress) {
      return res.status(400).json({ message: 'No active trade for this investment' });
    }
    
    // Check if 24h has passed
    const now = Date.now();
    const tradeElapsedTime = now - investment.tradeStartTime.getTime();
    const hoursElapsed = tradeElapsedTime / (1000 * 60 * 60);
    
    if (hoursElapsed < 24) {
      return res.status(400).json({ 
        message: `Trade can only be completed after 24 hours. Wait ${Math.ceil(24 - hoursElapsed)} more hours.` 
      });
    }
    
    // Calculate profit (using daily return percentage)
    const profitPercentage = investment.dailyReturnPercent;
    const profitAmount = (investment.lockedAmount * profitPercentage) / 100;
    
    // Update investment
    investment.tradeInProgress = false;
    investment.lockedAmount = 0;
    investment.tradeProfit = profitAmount;
    investment.totalReturnsEarned += profitAmount;
    investment.isCompleted = true;
    
    // Set withdrawal lock until 24 hours after trade completion
    const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    investment.withdrawalLockUntil = lockUntil;
    
    // Update trade history
    const activeTradeIndex = investment.tradeHistory.length - 1;
    if (activeTradeIndex >= 0) {
      investment.tradeHistory[activeTradeIndex].status = 'completed';
      investment.tradeHistory[activeTradeIndex].profitPercentage = profitPercentage;
      investment.tradeHistory[activeTradeIndex].profitAmount = profitAmount;
    }
    
    await investment.save();
    
    // Update user balance
    const user = await User.findById(req.user.userId);
    user.currentBalance += profitAmount;
    user.totalEarnings = (user.totalEarnings || 0) + profitAmount;
    await user.save();
    
    // Create transaction record
    const transaction = new Transaction({
      userId: req.user.userId,
      type: 'returns',
      amount: profitAmount,
      status: 'completed',
      investmentId: investment._id,
      description: `Trading profit from investment ${investment._id}`
    });
    await transaction.save();
    
    res.json({ 
      message: 'Trade completed! Profit credited to your balance. Funds locked for 24 hours.',
      investment,
      profitAmount,
      updatedBalance: user.currentBalance,
      withdrawalLockUntil: investment.withdrawalLockUntil
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete trade', error: error.message });
  }
});

// Request withdrawal - with 24-hour lock validation
router.post('/:id/withdraw', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    if (investment.isWithdrawn) {
      return res.status(400).json({ message: 'Already withdrawn' });
    }
    
    // Check 24-hour withdrawal lock
    const now = new Date();
    if (investment.withdrawalLockUntil && investment.withdrawalLockUntil > now) {
      const hoursRemaining = Math.ceil((investment.withdrawalLockUntil - now) / (1000 * 60 * 60));
      return res.status(400).json({
        message: `Funds are locked. Available for withdrawal in ${hoursRemaining} hours`,
        lockUntil: investment.withdrawalLockUntil,
        hoursRemaining: hoursRemaining
      });
    }
    
    // Calculate total amount (principal + earnings)
    const totalWithdrawAmount = investment.amount + investment.totalReturnsEarned;
    
    // Validate user has sufficient balance
    const user = await User.findById(req.user.userId);
    if (user.currentBalance < totalWithdrawAmount) {
      return res.status(400).json({
        message: 'Insufficient balance to complete withdrawal',
        currentBalance: user.currentBalance,
        requiredAmount: totalWithdrawAmount,
        shortfall: totalWithdrawAmount - user.currentBalance
      });
    }
    
    // Create withdrawal transaction
    const transaction = new Transaction({
      userId: req.user.userId,
      type: 'withdrawal',
      amount: totalWithdrawAmount,
      investmentId: investment._id,
      status: 'pending',
      details: {
        principal: investment.amount,
        earnings: investment.totalReturnsEarned,
        source: 'investment_withdrawal'
      }
    });
    await transaction.save();
    
    // Deduct from user balance
    user.currentBalance -= totalWithdrawAmount;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + totalWithdrawAmount;
    await user.save();
    
    investment.isWithdrawn = true;
    investment.withdrawnAt = new Date();
    investment.withdrawnAmount = totalWithdrawAmount;
    investment.status = 'completed';
    await investment.save();
    
    res.json({
      message: 'Withdrawal request submitted successfully',
      withdrawAmount: totalWithdrawAmount,
      principal: investment.amount,
      earnings: investment.totalReturnsEarned,
      transactionId: transaction._id,
      status: 'pending',
      newBalance: user.currentBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to request withdrawal', error: error.message });
  }
});

// Activate investment (after deposit is confirmed)
router.post('/:id/activate', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    if (investment.status === 'active') {
      return res.status(400).json({ message: 'Investment already active' });
    }
    
    const now = new Date();
    investment.status = 'active';
    investment.activatedAt = now;
    investment.canTradeAfter = now; // Can trade immediately after activation
    
    await investment.save();
    
    res.json({
      message: 'Investment activated successfully',
      investment,
      canTradeAfter: investment.canTradeAfter
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to activate investment', error: error.message });
  }
});

// Get user balance and withdrawal info - NEVER CRASHES, always returns valid data
// CRITICAL: Total Balance = Invested Capital + All Earnings (so users can withdraw and purchase PowaUp)
// Available Balance = Earnings + Cash Balance (profits users can withdraw or use for PowaUp)
router.get('/balance/info', authenticate, async (req, res) => {
  // Default safe response
  const defaultResponse = {
    totalBalance: 0,
    availableBalance: 0,
    lockedInTrades: 0,
    pendingWithdrawal: 0,
    earnings: 0,
    powaUpBalance: 0,
    investments: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalEarnings: 0,
    totalInvested: 0,
    investmentReturns: 0,
    puzzleGameBonuses: 0,
    tradingBonuses: 0,
    referralEarnings: 0,
    activityEarnings: 0
  };

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.json(defaultResponse);
    }

    // Get all active investments with error handling
    let activeInvestments = [];
    try {
      activeInvestments = await Investment.find({
        userId: req.user.userId,
        status: 'active',
        isWithdrawn: false
      });
    } catch (err) {
      console.error('[balance/info] Error fetching investments:', err);
    }

    // Calculate total invested capital and earnings from active investments
    let totalInvestedCapital = 0;
    let totalLockedInTrades = 0;
    let totalInvestmentEarnings = 0;
    let unlockedInvestmentCapital = 0;

    activeInvestments.forEach(inv => {
      // Add investment amount to invested capital
      const investmentAmount = inv.amount || 0;
      totalInvestedCapital += investmentAmount;
      
      // Calculate earnings for this investment (totalReturnsEarned or totalEarned)
      const investmentEarnings = inv.totalReturnsEarned || inv.totalEarned || 0;
      totalInvestmentEarnings += investmentEarnings;
      
      // If trade is in progress, the capital is locked
      if (inv.tradeInProgress) {
        totalLockedInTrades += investmentAmount;
      } else {
        // Investment capital is unlocked if no trade in progress
        unlockedInvestmentCapital += investmentAmount;
      }
    });

    // Get pending withdrawals with error handling
    let pendingWithdrawals = [];
    try {
      pendingWithdrawals = await Transaction.find({
        userId: req.user.userId,
        type: 'withdrawal',
        status: 'pending'
      });
    } catch (err) {
      console.error('[balance/info] Error fetching pending withdrawals:', err);
    }

    let totalPendingWithdrawal = 0;
    pendingWithdrawals.forEach(tx => {
      totalPendingWithdrawal += tx.amount || 0;
    });

    // Get user earnings breakdown - combine investment returns with stored user earnings
    const storedUserEarnings = Math.max(0, user.totalEarnings || 0);
    const puzzleGameBonuses = Math.max(0, user.puzzleGameBonuses || 0);
    const tradingBonuses = Math.max(0, user.tradingBonuses || 0);
    const referralEarnings = Math.max(0, user.referralEarnings || 0);
    const activityEarnings = Math.max(0, user.activityEarnings || 0);
    
    // Total earnings = max of (stored user earnings, calculated investment earnings) + bonuses
    // This ensures we capture earnings correctly even if stored differently
    const investmentReturns = Math.max(storedUserEarnings, totalInvestmentEarnings);
    const allBonuses = puzzleGameBonuses + tradingBonuses + referralEarnings + activityEarnings;
    const totalEarnings = investmentReturns + allBonuses;

    // Cash balance from user account (profits already credited)
    const cashBalance = Math.max(0, user.currentBalance || 0);
    
    // CRITICAL FIX: Total Balance = Invested Capital + All Earnings + Cash Balance
    // This shows users their FULL portfolio value
    const totalBalance = totalInvestedCapital + totalEarnings + cashBalance;
    
    // CRITICAL FIX: Available Balance = Cash Balance + Earnings + Unlocked Investment Capital - Pending Withdrawals
    // This is what users can ACTUALLY withdraw or use to buy PowaUp
    // Locked investments cannot be withdrawn until trade completes
    const availableBalance = Math.max(0, cashBalance + totalEarnings + unlockedInvestmentCapital - totalPendingWithdrawal);

    console.log('[balance/info] Balance calculation:', {
      userId: req.user.userId,
      cashBalance,
      totalInvestedCapital,
      unlockedInvestmentCapital,
      totalLockedInTrades,
      totalEarnings,
      investmentReturns,
      allBonuses,
      totalBalance,
      availableBalance,
      totalPendingWithdrawal
    });

    res.json({
      // Main balances - users can see full value and withdraw/purchase PowaUp
      totalBalance: Math.max(0, totalBalance),
      availableBalance: Math.max(0, availableBalance),
      lockedInTrades: Math.max(0, totalLockedInTrades),
      pendingWithdrawal: Math.max(0, totalPendingWithdrawal),
      
      // Earnings breakdown
      earnings: Math.max(0, totalEarnings),
      totalEarnings: Math.max(0, totalEarnings),
      investmentReturns: Math.max(0, investmentReturns),
      puzzleGameBonuses: Math.max(0, puzzleGameBonuses),
      tradingBonuses: Math.max(0, tradingBonuses),
      referralEarnings: Math.max(0, referralEarnings),
      activityEarnings: Math.max(0, activityEarnings),
      
      // Investment info
      totalInvested: Math.max(0, totalInvestedCapital),
      investments: activeInvestments.length,
      
      // User account info
      powaUpBalance: Math.max(0, user.powaUpBalance || 0),
      totalDeposited: Math.max(0, user.totalDeposited || totalInvestedCapital),
      totalWithdrawn: Math.max(0, user.totalWithdrawn || 0)
    });
  } catch (error) {
    console.error('[balance/info] Error:', error);
    res.json(defaultResponse);
  }
});

// Check if investment can be withdrawn
router.get('/:id/can-withdraw', authenticate, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!investment) {
      return res.status(404).json({ message: 'Investment not found' });
    }
    
    const now = new Date();
    let canWithdraw = true;
    let reason = '';
    let timeRemaining = 0;
    
    if (investment.withdrawalLockUntil && investment.withdrawalLockUntil > now) {
      canWithdraw = false;
      timeRemaining = Math.ceil((investment.withdrawalLockUntil - now) / (1000 * 60 * 60));
      reason = `Funds locked for ${timeRemaining} more hours`;
    }
    
    if (investment.tradeInProgress) {
      canWithdraw = false;
      reason = 'Trade in progress. Complete trade before withdrawing.';
    }
    
    if (investment.isWithdrawn) {
      canWithdraw = false;
      reason = 'Already withdrawn';
    }
    
    const withdrawAmount = investment.amount + investment.totalReturnsEarned;
    
    res.json({
      canWithdraw,
      reason,
      withdrawAmount,
      principal: investment.amount,
      earnings: investment.totalReturnsEarned,
      timeRemaining,
      lockUntil: investment.withdrawalLockUntil
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check withdrawal status', error: error.message });
  }
});

export default router;
