import User from '../models/User.js';
import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';

/**
 * User Balance Service - Validates and manages user balance operations
 * Ensures all balance changes are consistent and properly recorded
 */

/**
 * Validate PowaUp purchase - uses currentBalance (the withdrawable balance)
 * Users can purchase PowaUp with their currentBalance which includes all earnings
 */
export const validatePowaUpPurchase = async (userId, cost) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // currentBalance already includes all earnings (game rewards, referrals, trade profits)
    // This is the actual spendable/withdrawable balance
    const currentBalance = user.currentBalance || 0;

    // PowaUp can be purchased with currentBalance
    if (currentBalance < cost) {
      return {
        isValid: false,
        reason: 'Insufficient balance for PowaUp purchase',
        currentBalance: currentBalance,
        totalBalance: currentBalance,
        requiredAmount: cost,
        shortfall: cost - currentBalance
      };
    }

    return {
      isValid: true,
      currentBalance: currentBalance,
      totalBalance: currentBalance
    };
  } catch (error) {
    console.error('[userBalanceService] Error validating PowaUp purchase:', error);
    throw error;
  }
};

/**
 * Validate if user has sufficient balance for an operation
 */
export const validateSufficientBalance = async (userId, amount, operationType = 'withdrawal') => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get locked amounts in trades
    const activeInvestments = await Investment.find({
      userId,
      status: 'active',
      isWithdrawn: false
    });

    let totalLocked = 0;
    activeInvestments.forEach(inv => {
      if (inv.tradeInProgress && inv.lockedAmount) {
        totalLocked += inv.lockedAmount;
      }
    });

    // Get pending withdrawals
    const pendingWithdrawals = await Transaction.find({
      userId,
      type: 'withdrawal',
      status: 'pending'
    });

    let totalPending = 0;
    pendingWithdrawals.forEach(tx => {
      totalPending += tx.amount || 0;
    });

    const availableBalance = Math.max(0, user.currentBalance - totalLocked - totalPending);

    if (availableBalance < amount) {
      return {
        isValid: false,
        reason: `Insufficient ${operationType} balance`,
        availableBalance,
        requiredAmount: amount,
        shortfall: amount - availableBalance
      };
    }

    return {
      isValid: true,
      availableBalance
    };
  } catch (error) {
    console.error('[userBalanceService] Error validating balance:', error);
    throw error;
  }
};

/**
 * Deduct balance safely with validation
 */
export const deductBalance = async (userId, amount, reason, operationDetails = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate balance first
    const validation = await validateSufficientBalance(userId, amount);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    const balanceBefore = user.currentBalance;

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: reason,
      amount,
      status: 'completed',
      balanceBefore,
      balanceAfter: balanceBefore - amount,
      details: {
        ...operationDetails,
        timestamp: new Date(),
        reason
      }
    });
    await transaction.save();

    // Deduct balance
    user.currentBalance = balanceBefore - amount;

    if (reason === 'withdrawal') {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
    } else if (reason === 'powaup_purchase') {
      user.totalSpentOnPowaUp = (user.totalSpentOnPowaUp || 0) + amount;
    }

    await user.save();

    console.log(`[userBalanceService] Balance deducted for ${userId}: ${amount} (${reason})`);

    return {
      success: true,
      newBalance: user.currentBalance,
      transactionId: transaction._id,
      transaction
    };
  } catch (error) {
    console.error('[userBalanceService] Error deducting balance:', error);
    throw error;
  }
};

/**
 * Add balance with automatic transaction creation
 */
export const addBalance = async (userId, amount, reason, operationDetails = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const balanceBefore = user.currentBalance;

    const transaction = new Transaction({
      userId,
      type: reason,
      amount,
      status: 'completed',
      balanceBefore,
      balanceAfter: balanceBefore + amount,
      details: {
        ...operationDetails,
        timestamp: new Date(),
        reason
      }
    });
    await transaction.save();

    user.currentBalance = balanceBefore + amount;

    if (reason === 'deposit') {
      user.totalDeposited = (user.totalDeposited || 0) + amount;
    } else if (reason === 'returns') {
      user.totalEarnings = (user.totalEarnings || 0) + amount;
    } else if (reason === 'bonus') {
      user.totalBonuses = (user.totalBonuses || 0) + amount;
    }

    await user.save();

    console.log(`[userBalanceService] Balance added for ${userId}: ${amount} (${reason})`);

    return {
      success: true,
      newBalance: user.currentBalance,
      transactionId: transaction._id,
      transaction
    };
  } catch (error) {
    console.error('[userBalanceService] Error adding balance:', error);
    throw error;
  }
};

/**
 * Get complete balance breakdown
 */
export const getUserBalanceBreakdown = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const activeInvestments = await Investment.find({
      userId,
      status: 'active',
      isWithdrawn: false
    });

    let totalLocked = 0;
    activeInvestments.forEach(inv => {
      if (inv.tradeInProgress && inv.lockedAmount) {
        totalLocked += inv.lockedAmount;
      }
    });

    const pendingWithdrawals = await Transaction.find({
      userId,
      type: 'withdrawal',
      status: 'pending'
    });

    let totalPending = 0;
    pendingWithdrawals.forEach(tx => {
      totalPending += tx.amount || 0;
    });

    return {
      totalBalance: user.currentBalance,
      availableBalance: Math.max(0, user.currentBalance - totalLocked - totalPending),
      lockedInTrades: totalLocked,
      pendingWithdrawal: totalPending,
      totalDeposited: user.totalDeposited || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
      totalEarnings: user.totalEarnings || 0,
      powaUpBalance: user.powaUpBalance || 0
    };
  } catch (error) {
    console.error('[userBalanceService] Error getting balance breakdown:', error);
    throw error;
  }
};

/**
 * Process PowaUp purchase
 */
export const purchasePowaUp = async (userId, amount, cost) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const balanceBefore = user.currentBalance;

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'powaup_purchase',
      amount: cost,
      status: 'completed',
      balanceBefore,
      balanceAfter: balanceBefore - cost,
      details: {
        powaUpAmount: amount,
        pricePerPowaUp: cost / amount,
        timestamp: new Date()
      }
    });
    await transaction.save();

    // Update user balance and PowaUp
    user.currentBalance = balanceBefore - cost;
    user.powaUpBalance = (user.powaUpBalance || 0) + amount;
    user.totalPowaUpPurchased = (user.totalPowaUpPurchased || 0) + amount;
    user.totalSpentOnPowaUp = (user.totalSpentOnPowaUp || 0) + cost;

    await user.save();

    console.log(`[userBalanceService] PowaUp purchased for ${userId}: ${amount} units for $${cost}`);

    return {
      success: true,
      newBalance: user.currentBalance,
      newPowaUpBalance: user.powaUpBalance,
      transactionId: transaction._id,
      transaction
    };
  } catch (error) {
    console.error('[userBalanceService] Error purchasing PowaUp:', error);
    throw error;
  }
};

export default {
  validateSufficientBalance,
  validatePowaUpPurchase,
  deductBalance,
  addBalance,
  getUserBalanceBreakdown,
  purchasePowaUp
};
