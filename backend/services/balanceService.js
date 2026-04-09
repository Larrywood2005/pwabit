import User from '../models/User.js';
import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';
import Activity from '../models/Activity.js';

/**
 * Balance Service - Handles all balance calculations and management
 * Ensures accurate tracking of available, locked, and pending funds
 */

/**
 * Calculate all balance components for a user
 * Returns: {
 *   totalBalance: number,
 *   availableBalance: number,
 *   lockedInTrades: number,
 *   pendingWithdrawal: number,
 *   lastUpdated: timestamp
 * }
 */
export const calculateAvailableBalance = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get all active/locked investments with trades in progress
    const lockedInvestments = await Investment.find({
      userId,
      status: 'active',
      isCompleted: false
    });

    // Calculate locked amount from active trades
    const lockedInTrades = lockedInvestments.reduce((sum, inv) => {
      return sum + (inv.lockedAmount || 0);
    }, 0);

    // Get all pending withdrawals
    const pendingWithdrawals = await Transaction.find({
      userId,
      type: 'withdrawal',
      status: 'pending'
    });

    const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, trans) => {
      return sum + trans.amount;
    }, 0);

    // Ensure current balance is never negative
    let currentBalance = user.currentBalance || 0;
    if (currentBalance < 0) {
      currentBalance = 0;
      user.currentBalance = 0;
      await user.save();
      console.log(`[balanceService] Fixed negative balance for user ${userId}`);
    }

    // Get all completed activities (games, daily bonus, referrals)
    const completedActivities = await Activity.find({
      userId,
      status: 'credited'
    });

    const totalEarningsFromActivities = completedActivities.reduce((sum, activity) => {
      return sum + (activity.rewardAmount || 0);
    }, 0);

    // Calculate total earnings (investment returns + activity earnings)
    const totalEarnings = Math.max(0, (user.investmentReturns || 0) + totalEarningsFromActivities);

    // Total balance = initial investments + current balance + all earnings - amount spent on PowaUp
    const totalInvested = user.totalInvested || 0;
    const totalBalance = Math.max(0, totalInvested + currentBalance + totalEarnings - (user.totalSpentOnPowaUp || 0));

    // Available balance = total balance - locked - pending
    const availableBalance = Math.max(0, totalBalance - Math.max(0, lockedInTrades) - Math.max(0, pendingWithdrawalAmount));

    return {
      totalBalance: Math.max(0, totalBalance),
      availableBalance: Math.max(0, availableBalance),
      lockedInTrades: Math.max(0, lockedInTrades),
      pendingWithdrawal: Math.max(0, pendingWithdrawalAmount),
      totalInvested: Math.max(0, totalInvested),
      totalEarnings: Math.max(0, totalEarnings),
      investmentReturns: Math.max(0, user.investmentReturns || 0),
      activityEarnings: Math.max(0, totalEarningsFromActivities),
      puzzleGameBonuses: Math.max(0, user.puzzleGameBonuses || 0),
      referralEarnings: Math.max(0, user.referralEarnings || 0),
      tradingBonuses: Math.max(0, user.tradingBonuses || 0),
      powaUpBalance: Math.max(0, user.powaUpBalance || 0),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('[balanceService] Error calculating available balance:', error);
    throw error;
  }
}

/**
 * Calculate total locked funds for a user across all active trades
 */
export const calculateLockedFunds = async (userId) => {
  try {
    const lockedInvestments = await Investment.find({
      userId,
      status: 'active',
      isCompleted: false
    });

    return lockedInvestments.reduce((sum, inv) => {
      return sum + (inv.lockedAmount || 0);
    }, 0);
  } catch (error) {
    console.error('[balanceService] Error calculating locked funds:', error);
    throw error;
  }
}

/**
 * Process a withdrawal - deduct from available balance and create transaction
 * Performs validation and creates transaction record
 */
export const updateBalanceOnWithdrawal = async (userId, amount, withdrawalDetails = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate amount is positive
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    // Calculate available balance
    const balanceInfo = await calculateAvailableBalance(userId);
    
    if (balanceInfo.availableBalance < amount) {
      throw new Error(`Insufficient available balance. Available: $${balanceInfo.availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`);
    }

    // Check if user has active investments preventing withdrawal
    const investment = await Investment.findOne({
      userId,
      status: 'active',
      isCompleted: false
    });

    if (investment && investment.withdrawalLockUntil && investment.withdrawalLockUntil > new Date()) {
      const hoursRemaining = Math.ceil((investment.withdrawalLockUntil - new Date()) / (1000 * 60 * 60));
      throw new Error(`Funds locked for ${hoursRemaining} more hours`);
    }

    // Store balance BEFORE withdrawal
    const balanceBefore = user.currentBalance;

    // Create transaction record BEFORE deducting balance
    const transaction = new Transaction({
      userId,
      type: 'withdrawal',
      amount: amount,
      status: 'pending',
      balanceBefore: balanceBefore,
      balanceAfter: Math.max(0, balanceBefore - amount),
      details: {
        ...withdrawalDetails,
        withdrawalAddress: user.withdrawalAddress,
        timestamp: new Date()
      }
    });
    await transaction.save();

    // Deduct balance - ensure it never goes negative
    user.currentBalance = Math.max(0, user.currentBalance - amount);
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
    await user.save();

    // Log activity
    console.log(`[balanceService] Withdrawal created for user ${userId}: $${amount.toFixed(2)}, New Balance: $${user.currentBalance.toFixed(2)}, Transaction: ${transaction._id}`);

    return {
      success: true,
      transactionId: transaction._id,
      newBalance: Math.max(0, user.currentBalance),
      transaction: transaction
    };
  } catch (error) {
    console.error('[balanceService] Error processing withdrawal:', error);
    throw error;
  }
}

/**
 * Process PowaUp purchase - deduct cost from balance
 * Creates transaction record and updates user balance
 */
export const updateBalanceOnPowaUpPurchase = async (userId, amount, cost, purchaseDetails = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate inputs
    if (amount <= 0 || cost <= 0) {
      throw new Error('PowaUp amount and cost must be greater than zero');
    }

    const balanceInfo = await calculateAvailableBalance(userId);
    
    if (balanceInfo.availableBalance < cost) {
      throw new Error(`Insufficient balance. Available: $${balanceInfo.availableBalance.toFixed(2)}, Required: $${cost.toFixed(2)}`);
    }

    // Store balance BEFORE purchase
    const balanceBefore = user.currentBalance;

    // Create transaction record BEFORE deducting balance
    const transaction = new Transaction({
      userId,
      type: 'powaup_purchase',
      amount: cost,
      status: 'completed',
      balanceBefore: balanceBefore,
      balanceAfter: Math.max(0, balanceBefore - cost),
      details: {
        ...purchaseDetails,
        powaUpAmount: amount,
        costPerUnit: (cost / amount).toFixed(2),
        timestamp: new Date()
      }
    });
    await transaction.save();

    // Deduct balance - ensure it never goes negative
    user.currentBalance = Math.max(0, user.currentBalance - cost);
    user.powaUpBalance = (user.powaUpBalance || 0) + amount;
    user.totalSpentOnPowaUp = (user.totalSpentOnPowaUp || 0) + cost;
    await user.save();

    console.log(`[balanceService] PowaUp purchase for user ${userId}: ${amount} units for $${cost.toFixed(2)}, New Balance: $${user.currentBalance.toFixed(2)}, Transaction: ${transaction._id}`);

    return {
      success: true,
      transactionId: transaction._id,
      newBalance: Math.max(0, user.currentBalance),
      newPowaUpBalance: user.powaUpBalance,
      transaction: transaction
    };
  } catch (error) {
    console.error('[balanceService] Error processing PowaUp purchase:', error);
    throw error;
  }
}

/**
 * Add returns to user balance (from daily returns calculation)
 */
export const updateBalanceOnReturns = async (userId, returnAmount, investmentId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Create transaction
    const transaction = new Transaction({
      userId,
      type: 'returns',
      amount: returnAmount,
      status: 'completed',
      balanceBefore: user.currentBalance,
      balanceAfter: user.currentBalance + returnAmount,
      investmentId: investmentId,
      details: {
        source: 'investment_returns',
        timestamp: new Date()
      }
    });
    await transaction.save();

    // Add to balance
    user.currentBalance += returnAmount;
    user.totalEarnings = (user.totalEarnings || 0) + returnAmount;
    await user.save();

    console.log(`[balanceService] Returns added for user ${userId}: ${returnAmount}, Transaction: ${transaction._id}`);

    return {
      success: true,
      transactionId: transaction._id,
      newBalance: user.currentBalance,
      transaction: transaction
    };
  } catch (error) {
    console.error('[balanceService] Error processing returns:', error);
    throw error;
  }
}

/**
 * Refund a transaction (e.g., failed withdrawal, cancelled purchase)
 */
export const refundTransaction = async (userId, transactionId, reason) => {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Refund the amount
    user.currentBalance += transaction.amount;
    await user.save();

    // Create refund transaction
    const refundTransaction = new Transaction({
      userId,
      type: 'refund',
      amount: transaction.amount,
      status: 'completed',
      balanceBefore: user.currentBalance - transaction.amount,
      balanceAfter: user.currentBalance,
      details: {
        originalTransactionId: transactionId,
        reason: reason,
        timestamp: new Date()
      }
    });
    await refundTransaction.save();

    console.log(`[balanceService] Refund processed for user ${userId}: ${transaction.amount}, Reason: ${reason}`);

    return {
      success: true,
      refundTransactionId: refundTransaction._id,
      newBalance: user.currentBalance
    };
  } catch (error) {
    console.error('[balanceService] Error processing refund:', error);
    throw error;
  }
}

/**
 * Get transaction history for a user with pagination
 */
export const getUserTransactionHistory = async (userId, options = {}) => {
  try {
    const limit = options.limit || 50;
    const skip = (options.page || 0) * limit;
    const type = options.type || null; // Filter by type if provided

    let query = { userId };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    return {
      transactions,
      pagination: {
        page: options.page || 0,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[balanceService] Error fetching transaction history:', error);
    throw error;
  }
}

export default {
  calculateAvailableBalance,
  calculateLockedFunds,
  updateBalanceOnWithdrawal,
  updateBalanceOnPowaUpPurchase,
  updateBalanceOnReturns,
  refundTransaction,
  getUserTransactionHistory
};
