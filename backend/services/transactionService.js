import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Store Socket.io instance for real-time events
let io = null;

/**
 * Initialize the transaction service with Socket.io instance
 */
export const initTransactionService = (socketIo) => {
  io = socketIo;
  console.log('[TransactionService] Initialized with Socket.io');
};

/**
 * Central function to create a transaction and update user balance
 * Emits real-time events when Socket.io is available
 * 
 * @param {string} userId - User ID
 * @param {string} type - Transaction type: 'deposit', 'withdrawal', 'returns', 'bonus', 'powaup_purchase', 'activity_reward'
 * @param {number} amount - Transaction amount
 * @param {object} options - Additional options
 * @returns {object} - Transaction result with updated balance
 */
export const createTransaction = async (userId, type, amount, options = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const balanceBefore = user.currentBalance || 0;
    let balanceAfter = balanceBefore;

    // Determine if this is a credit or debit
    const creditTypes = ['deposit', 'returns', 'bonus', 'activity_reward', 'game_reward', 'referral_bonus'];
    const debitTypes = ['withdrawal', 'powaup_purchase', 'investment'];

    if (creditTypes.includes(type)) {
      balanceAfter = balanceBefore + amount;
    } else if (debitTypes.includes(type)) {
      if (balanceBefore < amount && type !== 'investment') {
        throw new Error(`Insufficient balance for ${type}. Available: $${balanceBefore}, Required: $${amount}`);
      }
      balanceAfter = balanceBefore - amount;
    }

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type,
      amount,
      status: options.status || 'completed',
      balanceBefore,
      balanceAfter,
      walletAddress: options.walletAddress,
      transactionHash: options.transactionHash,
      investmentId: options.investmentId,
      details: {
        ...options.details,
        timestamp: new Date(),
        source: options.source || 'system'
      }
    });
    await transaction.save();

    // Update user balance
    user.currentBalance = balanceAfter;

    // Update type-specific totals
    if (type === 'deposit') {
      user.totalDeposited = (user.totalDeposited || 0) + amount;
    } else if (type === 'withdrawal') {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
    } else if (type === 'returns' || type === 'activity_reward' || type === 'game_reward') {
      user.totalEarnings = (user.totalEarnings || 0) + amount;
    } else if (type === 'bonus' || type === 'referral_bonus') {
      user.totalBonuses = (user.totalBonuses || 0) + amount;
    }

    await user.save();

    console.log(`[TransactionService] Transaction created: ${type} $${amount} for user ${userId}`);

    // Emit real-time events if Socket.io is available
    if (io) {
      const roomId = `user_${userId}`;
      
      // Emit balance updated event
      io.to(roomId).emit('balanceUpdated', {
        totalBalance: user.currentBalance,
        availableBalance: user.currentBalance, // Will be calculated more accurately on client
        timestamp: new Date()
      });

      // Emit new transaction event
      io.to(roomId).emit('newTransaction', {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        balanceBefore,
        balanceAfter,
        createdAt: transaction.createdAt
      });

      console.log(`[TransactionService] Real-time events emitted to room: ${roomId}`);
    }

    return {
      success: true,
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        balanceBefore,
        balanceAfter,
        createdAt: transaction.createdAt
      },
      newBalance: user.currentBalance,
      user: {
        id: user._id,
        currentBalance: user.currentBalance,
        totalDeposited: user.totalDeposited,
        totalWithdrawn: user.totalWithdrawn,
        totalEarnings: user.totalEarnings
      }
    };
  } catch (error) {
    console.error('[TransactionService] Error creating transaction:', error);
    throw error;
  }
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (transactionId, status, options = {}) => {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = status;
    
    if (status === 'completed') {
      transaction.completedAt = new Date();
    } else if (status === 'confirmed') {
      transaction.confirmedAt = new Date();
      transaction.confirmedBy = options.adminId;
      transaction.confirmationNotes = options.notes;
    }

    await transaction.save();

    // Emit status update
    if (io) {
      const roomId = `user_${transaction.userId}`;
      io.to(roomId).emit('transactionUpdated', {
        id: transaction._id,
        status: transaction.status,
        updatedAt: new Date()
      });
    }

    return {
      success: true,
      transaction
    };
  } catch (error) {
    console.error('[TransactionService] Error updating transaction status:', error);
    throw error;
  }
};

/**
 * Get user transactions with pagination
 */
export const getUserTransactions = async (userId, options = {}) => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query = { userId };
    if (options.type) {
      query.type = options.type;
    }
    if (options.status) {
      query.status = options.status;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[TransactionService] Error fetching transactions:', error);
    throw error;
  }
};

export default {
  initTransactionService,
  createTransaction,
  updateTransactionStatus,
  getUserTransactions
};
