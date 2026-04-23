import User from '../models/User.js';
import balanceService from './balanceService.js';

/**
 * Transaction Logger Service - Comprehensive balance tracking
 * Logs all balance-changing operations with before/after state and availability impact
 */

/**
 * Log a balance transaction with full context
 * Ensures every earning, withdrawal, and purchase is tracked with complete balance state
 */
export const logBalanceTransaction = async (userId, transactionType, amount, context = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('[TransactionLogger] User not found:', userId);
      return;
    }

    // Get balance information AFTER the transaction (assuming it was already applied)
    const balanceInfo = await balanceService.calculateAvailableBalance(userId);

    const logEntry = {
      timestamp: new Date(),
      userId: userId.toString(),
      userEmail: user.email,
      transactionType: transactionType,
      amount: amount,
      
      // Balance state AFTER transaction
      balanceState: {
        currentBalance: Math.max(0, user.currentBalance),
        availableBalance: Math.max(0, balanceInfo.availableBalance),
        lockedInTrades: Math.max(0, balanceInfo.lockedInTrades),
        pendingWithdrawal: Math.max(0, balanceInfo.pendingWithdrawal),
        totalInvested: Math.max(0, balanceInfo.totalInvested),
        totalEarnings: Math.max(0, 
          (user.investmentReturns || 0) + 
          (user.puzzleGameBonuses || 0) + 
          (user.referralEarnings || 0) + 
          (user.tradingBonuses || 0)
        ),
        powaUpBalance: Math.max(0, user.powaUpBalance)
      },
      
      // Earnings breakdown
      earningsBreakdown: {
        investmentReturns: Math.max(0, user.investmentReturns || 0),
        puzzleGameBonuses: Math.max(0, user.puzzleGameBonuses || 0),
        referralEarnings: Math.max(0, user.referralEarnings || 0),
        tradingBonuses: Math.max(0, user.tradingBonuses || 0)
      },
      
      // Additional context
      ...context,
      
      // Validation check
      validation: {
        isConsistent: balanceInfo.availableBalance === Math.max(0, user.currentBalance - balanceInfo.lockedInTrades - balanceInfo.pendingWithdrawal),
        singleSourceOfTruth: 'currentBalance is source of truth',
        balanceNotNegative: user.currentBalance >= 0
      }
    };

    // Log in console with structured format
    console.log('[TRANSACTION LOG]', JSON.stringify(logEntry, null, 2));

    return logEntry;
  } catch (error) {
    console.error('[TransactionLogger] Error logging transaction:', error);
  }
};

/**
 * Validate balance consistency after ANY operation
 * Ensures currentBalance = sum of available + locked + pending
 */
export const validateBalanceConsistency = async (userId, operationName = 'operation') => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    const balanceInfo = await balanceService.calculateAvailableBalance(userId);
    
    const currentBalance = Math.max(0, user.currentBalance);
    const lockedInTrades = Math.max(0, balanceInfo.lockedInTrades);
    const pendingWithdrawal = Math.max(0, balanceInfo.pendingWithdrawal);
    const availableBalance = Math.max(0, balanceInfo.availableBalance);

    // Calculate expected relationship
    const expectedAvailable = currentBalance - lockedInTrades - pendingWithdrawal;
    const isConsistent = Math.abs(availableBalance - expectedAvailable) < 0.01; // Allow 1 cent rounding

    const validationLog = {
      timestamp: new Date(),
      userId: userId.toString(),
      operationName: operationName,
      currentBalance: currentBalance,
      lockedInTrades: lockedInTrades,
      pendingWithdrawal: pendingWithdrawal,
      availableBalance: availableBalance,
      expectedAvailable: expectedAvailable,
      isConsistent: isConsistent,
      message: isConsistent 
        ? 'Balance state is CONSISTENT' 
        : 'WARNING: Balance state is INCONSISTENT - this should never happen'
    };

    console.log('[BALANCE VALIDATION]', JSON.stringify(validationLog, null, 2));

    if (!isConsistent) {
      console.error('[CRITICAL] Balance inconsistency detected:', {
        userId: userId.toString(),
        operationName: operationName,
        currentBalance: currentBalance,
        calculated: expectedAvailable,
        actual: availableBalance,
        difference: Math.abs(availableBalance - expectedAvailable)
      });
    }

    return isConsistent;
  } catch (error) {
    console.error('[TransactionLogger] Validation error:', error);
    return false;
  }
};

/**
 * Detailed earnings audit for a user
 * Shows exactly what earnings are in currentBalance
 */
export const auditUserEarnings = async (userId) => {
  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      console.error('[EarningsAudit] User not found:', userId);
      return null;
    }

    const investmentReturns = user.investmentReturns || 0;
    const puzzleGameBonuses = user.puzzleGameBonuses || 0;
    const referralEarnings = user.referralEarnings || 0;
    const tradingBonuses = user.tradingBonuses || 0;

    const totalEarnings = investmentReturns + puzzleGameBonuses + referralEarnings + tradingBonuses;
    const currentBalance = user.currentBalance || 0;

    const auditReport = {
      timestamp: new Date(),
      userId: userId.toString(),
      userEmail: user.email,
      
      // What's in currentBalance
      currentBalance: currentBalance,
      
      // Earnings breakdown
      earnings: {
        investmentReturns: investmentReturns,
        puzzleGameBonuses: puzzleGameBonuses,
        referralEarnings: referralEarnings,
        tradingBonuses: tradingBonuses,
        totalEarnings: totalEarnings
      },
      
      // Original capital
      originalCapital: currentBalance - totalEarnings, // Should be non-negative
      
      // Validation
      validation: {
        allEarningsInCurrentBalance: totalEarnings <= currentBalance,
        message: `currentBalance includes $${totalEarnings.toFixed(2)} in earnings from all sources`
      }
    };

    console.log('[EARNINGS AUDIT]', JSON.stringify(auditReport, null, 2));

    return auditReport;
  } catch (error) {
    console.error('[EarningsAudit] Error auditing earnings:', error);
    return null;
  }
};

export default {
  logBalanceTransaction,
  validateBalanceConsistency,
  auditUserEarnings
};
