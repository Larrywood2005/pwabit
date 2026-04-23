import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import WalletAddress from '../models/WalletAddress.js';
import { getWalletAddresses } from '../config/wallets.js';
import balanceService from '../services/balanceService.js';

const router = express.Router();

// Socket.io instance will be injected via middleware
export const setSocketIO = (io) => {
  router.io = io;
};

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

// Create withdrawal request with real-time Socket.io event
router.post('/withdrawal', authenticate, async (req, res) => {
  // Create MongoDB session for transaction safety
  const session = await User.startSession();
  session.startTransaction();

  try {
    const { amount, currency, method, walletId, otp } = req.body;
    const userId = req.user.userId || req.user._id;

    // Validate input
    if (!amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Withdrawal amount must be greater than $0' });
    }

    if (amount < 5) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Minimum withdrawal amount is $5' });
    }

    if (!walletId && !method) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Wallet address or method is required' });
    }

    // Validate user exists before any operations
    let user;
    try {
      user = await User.findById(userId).session(session);
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Database error finding user:', {
        userId,
        error: dbError.message
      });
      return res.status(500).json({ message: 'Failed to retrieve user information' });
    }

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // MANDATORY: OTP verification is required - no bypassing
    // Check if OTP was provided
    if (!otp) {
      await session.abortTransaction();
      session.endSession();
      console.log('[v0] Withdrawal - OTP not provided:', { userId });
      return res.status(400).json({ message: 'OTP verification is required. Please provide your OTP.' });
    }

    // Verify OTP exists and is valid
    if (!user.withdrawalOTP) {
      await session.abortTransaction();
      session.endSession();
      console.warn('[v0] Withdrawal - No withdrawal OTP found for user:', {
        userId,
        hasOTP: !!user.withdrawalOTP,
        otpValue: user.withdrawalOTP
      });
      return res.status(400).json({ message: 'No OTP was requested. Please request a withdrawal OTP first.' });
    }

    // Check if OTP has expired (use <= for inclusive expiry check)
    if (user.withdrawalOTPExpire && user.withdrawalOTPExpire <= Date.now()) {
      try {
        user.withdrawalOTP = undefined;
        user.withdrawalOTPExpire = undefined;
        await user.save({ session });
      } catch (saveError) {
        console.error('[v0] Withdrawal - Error clearing expired OTP:', {
          userId,
          error: saveError.message
        });
      }
      await session.abortTransaction();
      session.endSession();
      console.warn('[v0] Withdrawal - OTP expired:', {
        userId,
        otpExpireTime: user.withdrawalOTPExpire,
        currentTime: Date.now(),
        expiredBy: Date.now() - user.withdrawalOTPExpire
      });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Normalize and compare OTP - strict verification
    const storedOTP = user.withdrawalOTP?.toString().trim();
    const incomingOTP = otp?.toString().trim();

    // DETAILED OTP DEBUG LOG (only stored in server logs, never sent to client)
    const otpDebug = {
      userId: userId.toString(),
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      storedOTPExists: !!storedOTP,
      incomingOTPExists: !!incomingOTP,
      storedOTPLength: storedOTP?.length || 0,
      incomingOTPLength: incomingOTP?.length || 0,
      storedOTPType: typeof storedOTP,
      incomingOTPType: typeof incomingOTP,
      // Safe logging: only show first 2 and last 2 chars
      storedOTPSafe: storedOTP ? `${storedOTP.substring(0, 2)}****${storedOTP.substring(storedOTP.length - 2)}` : 'EMPTY',
      incomingOTPSafe: incomingOTP ? `${incomingOTP.substring(0, 2)}****${incomingOTP.substring(incomingOTP.length - 2)}` : 'EMPTY',
      exactMatch: storedOTP === incomingOTP,
      otpExpireTime: user.withdrawalOTPExpire?.getTime?.() || user.withdrawalOTPExpire || 'N/A',
      currentTime: Date.now(),
      timeUntilExpiry: user.withdrawalOTPExpire ? user.withdrawalOTPExpire - Date.now() : 'N/A',
      isExpired: user.withdrawalOTPExpire && user.withdrawalOTPExpire <= Date.now()
    };

    console.log('[v0] Withdrawal - OTP Verification Attempt:', otpDebug);

    if (storedOTP !== incomingOTP) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - OTP MISMATCH - Withdrawal REJECTED:', {
        userId: userId.toString(),
        userEmail: user.email,
        storedOTPLength: storedOTP?.length,
        incomingOTPLength: incomingOTP?.length,
        storedOTPType: typeof storedOTP,
        incomingOTPType: typeof incomingOTP,
        match: false,
        reason: storedOTP?.length !== incomingOTP?.length ? 'LENGTH_MISMATCH' : 'VALUE_MISMATCH',
        message: 'FAILED - Balance NOT modified - Transaction ABORTED'
      });
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // OTP verified - clear it (one-time use)
    try {
      user.withdrawalOTP = undefined;
      user.withdrawalOTPExpire = undefined;
      user.withdrawalOTPVerified = true;
      await user.save({ session });
      console.log('[v0] Withdrawal - OTP verified successfully:', { userId });
    } catch (otpClearError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Error clearing OTP after verification:', {
        userId,
        error: otpClearError.message
      });
      return res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
    }

    // VALIDATION COMPLETE - Now check balance
    // Recalculate available balance using balance service for accuracy
    let balanceInfo;
    try {
      balanceInfo = await balanceService.calculateAvailableBalance(userId);
    } catch (balanceError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Error calculating balance:', {
        userId,
        error: balanceError.message,
        stack: balanceError.stack
      });
      return res.status(500).json({ message: 'Failed to calculate available balance' });
    }

    // Get current balance early for validation (SINGLE SOURCE OF TRUTH = availableBalance)
    const availableBalance = balanceInfo.availableBalance || 0;
    const currentBalance = user.currentBalance || 0;

    // CRITICAL VALIDATION: Check availableBalance (withdrawable funds after locked/pending deductions)
    // availableBalance = currentBalance - lockedInTrades - pendingWithdrawal
    // This ensures user can only withdraw what they truly have access to
    if (availableBalance < amount) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Insufficient availableBalance (SINGLE SOURCE OF TRUTH):', {
        userId,
        availableBalance,
        currentBalance,
        requestedAmount: amount,
        lockedInTrades: balanceInfo.lockedInTrades,
        pendingWithdrawal: balanceInfo.pendingWithdrawal,
        shortfall: amount - availableBalance,
        message: 'Balance validation FAILED - Transaction ABORTED - Balance NOT modified'
      });
      return res.status(400).json({
        message: `Insufficient available balance for withdrawal. Available: $${availableBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
        availableBalance: availableBalance,
        currentBalance: currentBalance,
        requestedAmount: amount,
        lockedInTrades: balanceInfo.lockedInTrades,
        pendingWithdrawal: balanceInfo.pendingWithdrawal,
        details: 'Your current balance includes locked funds in active trades and pending withdrawals'
      });
    }

    // Get wallet address details (outside transaction - read-only)
    let walletAddress = '';
    let walletType = 'crypto';

    if (walletId) {
      try {
        const wallet = await WalletAddress.findById(walletId).catch(() => null);

        if (wallet) {
          walletAddress = wallet.walletAddress;
          walletType = wallet.walletType;
        }
      } catch (walletError) {
        console.warn('[v0] Withdrawal - Could not fetch wallet address details:', {
          walletId,
          error: walletError.message
        });
      }
    }

    // TRANSACTION BLOCK: Balance deduction and transaction record created atomically
    // CRITICAL: Calculate and validate final balance BEFORE any modifications
    const balanceBefore = user.currentBalance || 0;
    const balanceAfter = balanceBefore - amount;

    // BALANCE DEBUG LOG - Show availableBalance as SINGLE SOURCE OF TRUTH
    console.log('[BALANCE DEBUG - WITHDRAWAL]', {
      userId: userId.toString(),
      availableBalance: balanceBefore - Math.max(0, balanceInfo.lockedInTrades) - Math.max(0, balanceInfo.pendingWithdrawal),
      currentBalance: balanceBefore,
      lockedInTrades: balanceInfo.lockedInTrades,
      pendingWithdrawal: balanceInfo.pendingWithdrawal,
      totalBalance: balanceInfo.totalBalance,
      requestedWithdrawal: amount,
      balanceAfterWithdrawal: balanceAfter,
      canWithdraw: (balanceBefore - Math.max(0, balanceInfo.lockedInTrades) - Math.max(0, balanceInfo.pendingWithdrawal)) >= amount,
      message: 'SINGLE SOURCE OF TRUTH: availableBalance = currentBalance - lockedInTrades - pendingWithdrawal'
    });

    // SAFETY GUARD: Check if balance would go negative
    if (balanceAfter < 0) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - CRITICAL: Balance would go negative, aborting:', {
        userId,
        balanceBefore,
        requestedAmount: amount,
        balanceAfter,
        message: 'PREVENTING NEGATIVE BALANCE'
      });
      return res.status(400).json({
        message: 'Insufficient balance for withdrawal',
        currentBalance: balanceBefore,
        requestedAmount: amount,
        wouldResultIn: balanceAfter
      });
    }

    // Update user balance within transaction
    user.currentBalance = balanceAfter;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;

    try {
      await user.save({ session });
      console.log('[v0] Withdrawal - User balance updated within transaction:', {
        userId,
        balanceBefore,
        balanceAfter,
        totalWithdrawn: user.totalWithdrawn,
        message: 'Balance update successful'
      });
    } catch (saveError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Error updating user balance:', {
        userId,
        error: saveError.message,
        stack: saveError.stack,
        message: 'ROLLING BACK - Balance not modified'
      });
      return res.status(500).json({ message: 'Failed to process withdrawal. Please try again.' });
    }

    // Create withdrawal transaction within same transaction block
    let transaction;
    try {
      transaction = new Transaction({
        userId,
        type: 'withdrawal',
        amount: amount,
        currency: currency || 'USD',
        walletAddress: walletAddress || '',
        walletType: walletType || 'crypto',
        method: method || 'crypto',
        status: 'pending',
        withdrawalStatus: 'pending',
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        fundsDebited: true,
        fundsDebitedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await transaction.save({ session });
      console.log('[v0] Withdrawal - Transaction record created within transaction:', {
        transactionId: transaction._id,
        userId,
        amount,
        message: 'Transaction record created successfully'
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Error creating transaction record:', {
        userId,
        amount,
        error: transactionError.message,
        stack: transactionError.stack,
        message: 'ROLLING BACK - Balance and transaction rolled back'
      });
      // Automatic rollback ensures balance is restored
      return res.status(500).json({ message: 'Failed to create withdrawal transaction' });
    }

    // Commit the transaction - both balance update and transaction record succeed together
    try {
      await session.commitTransaction();
      console.log('[v0] Withdrawal - Transaction committed successfully:', {
        userId,
        transactionId: transaction._id,
        amount,
        balanceBefore,
        balanceAfter,
        message: 'ATOMIC TRANSACTION COMMITTED - Balance permanently updated'
      });
    } catch (commitError) {
      await session.abortTransaction();
      session.endSession();
      console.error('[v0] Withdrawal - Error committing transaction:', {
        userId,
        error: commitError.message,
        stack: commitError.stack,
        message: 'ROLLBACK - Transaction not committed'
      });
      return res.status(500).json({ message: 'Failed to finalize withdrawal. Please try again.' });
    } finally {
      session.endSession();
    }

    // Refresh transaction with populated user data
    try {
      transaction = await Transaction.findById(transaction._id).populate('userId', 'fullName email');
    } catch (refreshError) {
      console.warn('[v0] Withdrawal - Could not refresh transaction data:', {
        error: refreshError.message
      });
    }

    // After successful commit, emit Socket.io events for real-time updates
    if (router.io) {
      try {
        // Emit to admin room for dashboard update
        router.io.to('admin').emit('withdrawal-created', {
          _id: transaction._id,
          userId: {
            _id: transaction.userId?._id,
            fullName: transaction.userId?.fullName,
            email: transaction.userId?.email
          },
          amount: transaction.amount,
          currency: transaction.currency,
          walletAddress: transaction.walletAddress,
          walletType: transaction.walletType,
          status: 'pending',
          withdrawalStatus: 'pending',
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter,
          createdAt: transaction.createdAt
        });

        // Emit to the specific user for real-time UI update
        router.io.to(userId.toString()).emit('withdrawal-created', {
          _id: transaction._id,
          amount: transaction.amount,
          status: 'pending',
          newBalance: balanceAfter,
          createdAt: transaction.createdAt
        });

        console.log('[v0] Withdrawal - Real-time events emitted after transaction commit:', {
          transactionId: transaction._id,
          userId,
          amount,
          walletAddress
        });
      } catch (socketError) {
        console.error('[v0] Withdrawal - Socket.io emission failed (non-critical):', {
          error: socketError.message
        });
        // Don't fail the request if socket emission fails - transaction already committed
      }
    }

    console.log('[v0] Withdrawal - Successfully created with transaction safety:', {
      userId,
      amount,
      walletAddress,
      balanceBefore,
      balanceAfter,
      transactionId: transaction._id,
      status: 'pending',
      message: 'Atomic transaction: balance deduction + withdrawal record'
    });

    res.status(200).json({
      message: 'Withdrawal successfully created. Funds have been debited and are awaiting admin processing.',
      withdrawal: {
        _id: transaction._id,
        amount: transaction.amount,
        status: 'pending',
        walletAddress: walletAddress,
        walletType: walletType,
        createdAt: transaction.createdAt
      },
      newBalance: balanceAfter,
      success: true
    });
  } catch (error) {
    // Ensure session is properly aborted on any error (if it exists and is active)
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
        console.log('[v0] Withdrawal - Transaction rolled back on error:', {
          userId: req.user?.userId || req.user?._id,
          errorMessage: error.message,
          message: 'SESSION ABORTED - Balance preserved'
        });
      } catch (rollbackError) {
        console.error('[v0] Withdrawal - Error during rollback:', {
          error: rollbackError.message,
          message: 'CRITICAL: Session cleanup failed'
        });
      }
    }

    console.error('[v0] Withdrawal - Unexpected error (transaction rolled back):', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId || req.user?._id,
      message: 'AUTOMATIC ROLLBACK - User balance unchanged'
    });
    res.status(500).json({
      message: 'Failed to process withdrawal. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin endpoint: Mark withdrawal as paid and processed
router.post('/admin/mark-paid/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { paidAmount, paymentProof, notes } = req.body;

    // Verify admin authentication
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can mark withdrawals as paid' });
    }

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Verify it's a withdrawal
    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ message: 'This transaction is not a withdrawal' });
    }

    // Update transaction status to paid
    transaction.withdrawalStatus = 'paid';
    transaction.status = 'paid';
    transaction.paidAt = new Date();
    transaction.paidAmount = paidAmount || transaction.amount;
    transaction.paymentProof = paymentProof;
    transaction.adminNotes = notes;
    await transaction.save();

    // Emit Socket.io event to notify admin and user
    if (router.io) {
      try {
        router.io.to('admin').emit('withdrawal-paid', {
          _id: transaction._id,
          userId: transaction.userId,
          amount: transaction.amount,
          status: 'paid',
          paidAt: transaction.paidAt
        });

        router.io.to(transaction.userId.toString()).emit('withdrawal-paid', {
          _id: transaction._id,
          amount: transaction.amount,
          status: 'paid',
          message: 'Your withdrawal has been processed and paid!'
        });

        console.log('[v0] Withdrawal marked as paid:', {
          transactionId: transaction._id,
          amount: transaction.amount,
          paidAmount: transaction.paidAmount,
          paidAt: transaction.paidAt
        });
      } catch (socketError) {
        console.warn('[v0] Socket.io emission failed:', socketError.message);
      }
    }

    res.json({
      message: 'Withdrawal marked as paid successfully',
      transaction: {
        _id: transaction._id,
        status: 'paid',
        paidAt: transaction.paidAt,
        amount: transaction.amount
      }
    });
  } catch (error) {
    console.error('[v0] Admin mark paid error:', error);
    res.status(500).json({ message: 'Failed to mark withdrawal as paid', error: error.message });
  }
});

export default router;
