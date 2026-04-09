import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import balanceService from './balanceService.js';

/**
 * Admin Report Service - Provides real-time reporting and analytics
 * Tracks all financial operations for audit and monitoring
 */

/**
 * Get real-time balance for a specific user (Admin view)
 */
export const getRealtimeUserBalance = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const balanceInfo = await balanceService.calculateAvailableBalance(userId);
    const lockedFunds = await balanceService.calculateLockedFunds(userId);

    // Get pending transactions
    const pendingTransactions = await Transaction.find({
      userId,
      status: 'pending'
    });

    // Get active investments
    const activeInvestments = await Investment.find({
      userId,
      status: 'active',
      isCompleted: false
    });

    return {
      userId,
      userName: user.name || 'Unknown',
      email: user.email,
      totalBalance: balanceInfo.totalBalance,
      availableBalance: balanceInfo.availableBalance,
      lockedInTrades: lockedFunds,
      pendingWithdrawal: balanceInfo.pendingWithdrawal,
      accountStats: {
        totalDeposited: user.totalDeposited || 0,
        totalWithdrawn: user.totalWithdrawn || 0,
        totalEarnings: user.totalEarnings || 0,
        totalBonuses: user.totalBonuses || 0,
        powaUpBalance: user.powaUpBalance || 0,
        totalSpentOnPowaUp: user.totalSpentOnPowaUp || 0
      },
      pendingTransactions: pendingTransactions.length,
      activeInvestments: activeInvestments.length,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('[adminReportService] Error getting real-time balance:', error);
    throw error;
  }
}

/**
 * Get all withdrawal transactions with filtering and pagination
 */
export const getWithdrawalLog = async (filters = {}) => {
  try {
    const page = filters.page || 0;
    const limit = filters.limit || 50;
    const status = filters.status || null;
    const startDate = filters.startDate || null;
    const endDate = filters.endDate || null;
    const userId = filters.userId || null;

    let query = { type: 'withdrawal' };

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    // Calculate summary
    const summary = {
      total: total,
      totalAmount: 0,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0
      },
      byStatusAmount: {
        pending: 0,
        processing: 0,
        completed: 0
      }
    };

    const allTransactions = await Transaction.find(query);
    allTransactions.forEach(trans => {
      summary.totalAmount += trans.amount;
      if (summary.byStatus[trans.status] !== undefined) {
        summary.byStatus[trans.status]++;
        summary.byStatusAmount[trans.status] += trans.amount;
      }
    });

    return {
      withdrawals: transactions,
      summary: summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[adminReportService] Error getting withdrawal log:', error);
    throw error;
  }
}

/**
 * Get all PowaUp purchase transactions
 */
export const getPowaUpPurchaseLog = async (filters = {}) => {
  try {
    const page = filters.page || 0;
    const limit = filters.limit || 50;
    const startDate = filters.startDate || null;
    const endDate = filters.endDate || null;
    const userId = filters.userId || null;

    let query = { type: 'powaup_purchase' };

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    // Calculate summary
    const summary = {
      total: total,
      totalRevenue: 0,
      totalPowaUpSold: 0,
      averageOrderValue: 0
    };

    const allTransactions = await Transaction.find(query);
    allTransactions.forEach(trans => {
      summary.totalRevenue += trans.amount;
      summary.totalPowaUpSold += trans.details?.powaUpAmount || 0;
    });

    summary.averageOrderValue = summary.total > 0 ? summary.totalRevenue / summary.total : 0;

    return {
      purchases: transactions,
      summary: summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[adminReportService] Error getting PowaUp purchase log:', error);
    throw error;
  }
}

/**
 * Track complete cash flow for a user in a date range
 */
export const trackUserCashFlow = async (userId, dateRange = {}) => {
  try {
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

    const query = {
      userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const transactions = await Transaction.find(query).sort({ createdAt: 1 });

    const cashFlow = {
      period: {
        start: startDate,
        end: endDate
      },
      byType: {},
      totalInflow: 0,
      totalOutflow: 0,
      netFlow: 0,
      transactions: transactions
    };

    // Categorize inflows and outflows
    transactions.forEach(trans => {
      if (!cashFlow.byType[trans.type]) {
        cashFlow.byType[trans.type] = {
          count: 0,
          amount: 0
        };
      }

      cashFlow.byType[trans.type].count++;
      cashFlow.byType[trans.type].amount += trans.amount;

      // Inflow: deposit, returns, bonus, refund
      if (['deposit', 'returns', 'bonus', 'refund'].includes(trans.type)) {
        cashFlow.totalInflow += trans.amount;
      }

      // Outflow: withdrawal, powaup_purchase
      if (['withdrawal', 'powaup_purchase'].includes(trans.type)) {
        cashFlow.totalOutflow += trans.amount;
      }
    });

    cashFlow.netFlow = cashFlow.totalInflow - cashFlow.totalOutflow;

    return cashFlow;
  } catch (error) {
    console.error('[adminReportService] Error tracking user cash flow:', error);
    throw error;
  }
}

/**
 * Get overall system metrics and dashboard summary
 */
export const getDashboardMetrics = async (dateRange = {}) => {
  try {
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

    const query = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get all transactions in period
    const allTransactions = await Transaction.find(query);

    // Count active investments
    const activeInvestments = await Investment.find({
      status: 'active',
      isCompleted: false
    });

    // Get all users
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Calculate metrics
    const metrics = {
      period: {
        start: startDate,
        end: endDate
      },
      userMetrics: {
        totalUsers,
        activeUsers,
        activeInvestments: activeInvestments.length,
        totalInvestedAmount: activeInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      },
      transactionMetrics: {
        totalTransactions: allTransactions.length,
        deposits: {
          count: 0,
          amount: 0
        },
        withdrawals: {
          count: 0,
          amount: 0,
          pending: 0,
          processing: 0,
          completed: 0
        },
        powaupPurchases: {
          count: 0,
          amount: 0,
          units: 0
        },
        returns: {
          count: 0,
          amount: 0
        }
      },
      balanceMetrics: {
        totalPlatformBalance: 0,
        totalAvailableBalance: 0,
        totalLockedBalance: 0
      }
    };

    // Process transactions
    for (const trans of allTransactions) {
      switch (trans.type) {
        case 'deposit':
          metrics.transactionMetrics.deposits.count++;
          metrics.transactionMetrics.deposits.amount += trans.amount;
          break;
        case 'withdrawal':
          metrics.transactionMetrics.withdrawals.count++;
          metrics.transactionMetrics.withdrawals.amount += trans.amount;
          if (trans.status === 'pending') metrics.transactionMetrics.withdrawals.pending++;
          if (trans.status === 'processing') metrics.transactionMetrics.withdrawals.processing++;
          if (trans.status === 'completed') metrics.transactionMetrics.withdrawals.completed++;
          break;
        case 'powaup_purchase':
          metrics.transactionMetrics.powaupPurchases.count++;
          metrics.transactionMetrics.powaupPurchases.amount += trans.amount;
          metrics.transactionMetrics.powaupPurchases.units += trans.details?.powaUpAmount || 0;
          break;
        case 'returns':
          metrics.transactionMetrics.returns.count++;
          metrics.transactionMetrics.returns.amount += trans.amount;
          break;
      }
    }

    // Calculate balance metrics - get all users' balances
    const allUsers = await User.find({}, 'currentBalance');
    for (const user of allUsers) {
      metrics.balanceMetrics.totalPlatformBalance += user.currentBalance || 0;
    }

    // Calculate locked and available
    for (const inv of activeInvestments) {
      metrics.balanceMetrics.totalLockedBalance += inv.lockedAmount || 0;
    }

    metrics.balanceMetrics.totalAvailableBalance = 
      metrics.balanceMetrics.totalPlatformBalance - metrics.balanceMetrics.totalLockedBalance;

    return metrics;
  } catch (error) {
    console.error('[adminReportService] Error getting dashboard metrics:', error);
    throw error;
  }
}

/**
 * Get pending withdrawals awaiting approval
 */
export const getPendingWithdrawals = async () => {
  try {
    const pendingWithdrawals = await Transaction.find({
      type: 'withdrawal',
      status: { $in: ['pending', 'processing'] }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 });

    return {
      count: pendingWithdrawals.length,
      totalAmount: pendingWithdrawals.reduce((sum, trans) => sum + trans.amount, 0),
      withdrawals: pendingWithdrawals
    };
  } catch (error) {
    console.error('[adminReportService] Error getting pending withdrawals:', error);
    throw error;
  }
}

/**
 * Get summary of user activity and spending
 */
export const getUserSummary = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const transactions = await Transaction.find({ userId });
    const investments = await Investment.find({ userId });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      balance: {
        current: user.currentBalance || 0,
        totalDeposited: user.totalDeposited || 0,
        totalWithdrawn: user.totalWithdrawn || 0,
        totalEarnings: user.totalEarnings || 0,
        totalBonuses: user.totalBonuses || 0
      },
      powaup: {
        balance: user.powaUpBalance || 0,
        totalSpent: user.totalSpentOnPowaUp || 0
      },
      transactions: {
        total: transactions.length,
        deposits: transactions.filter(t => t.type === 'deposit').length,
        withdrawals: transactions.filter(t => t.type === 'withdrawal').length,
        powaupPurchases: transactions.filter(t => t.type === 'powaup_purchase').length,
        returns: transactions.filter(t => t.type === 'returns').length
      },
      investments: {
        total: investments.length,
        active: investments.filter(i => !i.isCompleted).length,
        completed: investments.filter(i => i.isCompleted).length,
        totalInvested: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        totalEarned: investments.reduce((sum, inv) => sum + (inv.totalReturnsEarned || 0), 0)
      }
    };
  } catch (error) {
    console.error('[adminReportService] Error getting user summary:', error);
    throw error;
  }
}

export default {
  getRealtimeUserBalance,
  getWithdrawalLog,
  getPowaUpPurchaseLog,
  trackUserCashFlow,
  getDashboardMetrics,
  getPendingWithdrawals,
  getUserSummary
};
