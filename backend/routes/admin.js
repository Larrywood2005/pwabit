import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import Admin from '../models/Admin.js';
import Wallet from '../models/Wallet.js';
import balanceService from '../services/balanceService.js';
import transactionLogger from '../services/transactionLogger.js';

const router = express.Router();

// Socket.io instance will be injected via middleware
export const setSocketIO = (io) => {
  router.io = io;
};

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[v0] Admin login attempt:', email);

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('[v0] Admin not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      console.log('[v0] Invalid password for admin:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        _id: admin._id,
        userId: admin._id,
        id: admin._id,
        role: admin.role || 'super_admin',
        email: admin.email,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[v0] Admin login successful:', email);

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin._id, fullName: admin.fullName, role: admin.role, email: admin.email }
    });
  } catch (error) {
    console.error('[v0] Admin login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get current admin
router.get('/me', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId || req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in token' });
    }

    const admin = await Admin.findById(userId).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    console.error('[v0] Error fetching admin data:', error);
    res.status(500).json({ message: 'Failed to fetch admin data', error: error.message });
  }
});

// Get all users with real-time data
router.get('/users', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let filter = {};

    if (status) filter.status = status;

    console.log('[v0] Admin fetching users - Page:', page, 'Limit:', limit, 'Filter:', filter);

    const users = await User.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password')
      .lean();

    const total = await User.countDocuments(filter);

    // Enrich each user with real-time data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const investments = await Investment.find({ userId: user._id }).lean();
      const transactions = await Transaction.find({ userId: user._id }).lean();
      const bankAccounts = await User.findById(user._id).select('bankAccounts').lean();

      return {
        ...user,
        investmentCount: investments.length,
        totalInvestments: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        transactionCount: transactions.length,
        pendingWithdrawals: transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length,
        bankAccountCount: bankAccounts?.bankAccounts?.length || 0,
        kycStatus: user.kycStatus || 'not-submitted',
        status: user.status || 'active'
      };
    }));

    console.log('[v0] Fetched', enrichedUsers.length, 'users with real-time data');

    res.json({
      users: enrichedUsers,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('[v0] Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get user details with withdrawals, KYC, and bank accounts (Real-time) - COMPLETE DATA
router.get('/users/:id', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    console.log('[v0] Admin fetching user details:', req.params.id);

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // CRITICAL: Use balanceService as SINGLE SOURCE OF TRUTH
    // This ensures admin view = user dashboard = withdrawal/purchase endpoints
    const balanceInfo = await balanceService.calculateAvailableBalance(user._id);

    // Use ONLY values from balanceService - do NOT recalculate
    const availableBalance = Math.max(0, balanceInfo.availableBalance || 0);
    const lockedInTrades = Math.max(0, balanceInfo.lockedInTrades || 0);
    const pendingWithdrawal = Math.max(0, balanceInfo.pendingWithdrawal || 0);
    const totalInvested = Math.max(0, balanceInfo.totalInvested || 0);

    console.log('[BALANCE DEBUG - ADMIN USER DETAILS] - SINGLE SOURCE OF TRUTH', {
      userId: user._id.toString(),
      currentBalance: user.currentBalance,
      availableBalance: availableBalance,
      lockedInTrades: lockedInTrades,
      pendingWithdrawal: pendingWithdrawal,
      totalInvested: totalInvested,
      source: 'balanceService.calculateAvailableBalance (SINGLE SOURCE OF TRUTH)'
    });

    // Fetch all related data in parallel
    const [investments, wallet, transactions, bankAccounts] = await Promise.all([
      Investment.find({ userId: user._id }),
      Wallet.findOne({ userId: user._id }),
      Transaction.find({ userId: user._id }).sort({ createdAt: -1 }),
      User.findById(user._id).select('bankAccounts').then(u => u?.bankAccounts || [])
    ]);

    // Separate transactions by type
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    const deposits = transactions.filter(t => t.type === 'deposit');
    const gameRewards = transactions.filter(t => t.type === 'game_reward' || t.type === 'daily_bonus');
    const referralCommissions = transactions.filter(t => t.type === 'referral_commission');

    // Calculate breakdowns from balanceService (SINGLE SOURCE OF TRUTH)
    const totalEarningsFromInvestments = Math.max(0, balanceInfo.investmentReturns || 0);
    const totalGameRewards = Math.max(0, balanceInfo.puzzleGameBonuses || 0);
    const totalReferralEarnings = Math.max(0, balanceInfo.referralEarnings || 0);
    const tradingBonuses = Math.max(0, balanceInfo.tradingBonuses || 0);
    
    // Total earnings from balanceService
    const totalEarnings = totalEarningsFromInvestments + totalGameRewards + totalReferralEarnings + tradingBonuses;

    // Calculate PowaUp balance and spent
    const powaUpPurchases = transactions.filter(t => t.type === 'powaup_purchase' || (t.type === 'transfer' && t.details?.source === 'powaup_purchase'));
    const powaUpSpent = powaUpPurchases.reduce((sum, t) => sum + (t.amount || 0), 0);

    const userDetails = {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified || false
      },
      // COMPLETE FINANCIAL SUMMARY - SINGLE SOURCE OF TRUTH FROM balanceService
      financialSummary: {
        // SINGLE SOURCE OF TRUTH: Use values from balanceService
        currentBalance: Math.max(0, user.currentBalance || 0),
        availableBalance: availableBalance, // = currentBalance - locked - pending
        lockedInTrades: lockedInTrades,
        pendingWithdrawal: pendingWithdrawal,
        totalDeposited: Math.max(0, user.totalDeposited || 0),
        totalWithdrawn: Math.max(0, user.totalWithdrawn || 0),
        totalInvested: totalInvested,
        totalEarnings: totalEarnings,
        totalEarningsFromInvestments: totalEarningsFromInvestments,
        totalGameRewards: totalGameRewards,
        totalReferralEarnings: totalReferralEarnings,
        tradingBonuses: tradingBonuses,
        powaUpBalance: Math.max(0, user.powaUpBalance || 0),
        powaUpSpent: powaUpSpent,
        investmentCount: investments.length,
        activeInvestments: investments.filter(i => i.status === 'active').length,
        source: 'balanceService.calculateAvailableBalance (SINGLE SOURCE OF TRUTH)'
      },
      // KYC DETAILS - COMPLETE
      kyc: {
        status: user.kycStatus || 'not-submitted',
        documents: user.kycDocuments || {},
        submittedAt: user.kycDocuments?.submittedAt || null,
        verifiedAt: user.kycDocuments?.verifiedAt || null,
        verifiedBy: user.kycDocuments?.verifiedBy || null,
        rejectedAt: user.kycDocuments?.rejectedAt || null,
        rejectedBy: user.kycDocuments?.rejectedBy || null,
        rejectionReason: user.kycDocuments?.rejectionReason || null,
        notes: user.kycDocuments?.notes || null
      },
      // INVESTMENTS
      investments: investments.map(inv => ({
        _id: inv._id,
        amount: inv.amount,
        package: inv.package || inv.packageName,
        packageId: inv.packageId,
        status: inv.status,
        cryptoType: inv.cryptoType,
        dailyReturnPercent: inv.dailyReturnPercent || 3,
        activatedAt: inv.activatedAt,
        maturityDate: inv.maturityDate,
        totalReturnsEarned: inv.totalReturnsEarned || 0,
        lastReturnDate: inv.lastReturnDate,
        createdAt: inv.createdAt
      })),
      // WITHDRAWALS - ALL
      withdrawals: withdrawals.map(w => ({
        _id: w._id,
        amount: w.amount,
        currency: w.currency,
        method: w.method,
        walletAddress: w.walletAddress,
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
        completedAt: w.completedAt,
        rejectionReason: w.rejectionReason
      })),
      // DEPOSITS - ALL
      deposits: deposits.map(d => ({
        _id: d._id,
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        status: d.status,
        receiptUrl: d.receiptUrl,
        createdAt: d.createdAt,
        confirmedAt: d.confirmedAt
      })),
      // ALL TRANSACTIONS
      allTransactions: transactions.slice(0, 20).map(t => ({
        _id: t._id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        details: t.details
      })),
      // GAME REWARDS
      gameRewards: gameRewards.slice(0, 10).map(r => ({
        _id: r._id,
        amount: r.amount,
        type: r.type,
        description: r.description,
        createdAt: r.createdAt
      })),
      // REFERRAL INFO
      referrals: {
        referralCode: user.referralCode || null,
        referredBy: user.referredBy || null,
        directReferrals: user.referrals?.length || 0,
        totalReferralEarnings: totalReferralEarnings,
        referralStats: user.referralStats || {}
      },
      // WALLET & BANK ACCOUNTS
      wallet: wallet,
      bankAccounts: bankAccounts.map(ba => ({
        _id: ba._id,
        accountHolder: ba.accountHolder,
        accountNumber: ba.accountNumber,
        bankName: ba.bankName,
        currency: ba.currency,
        status: ba.status,
        addedAt: ba.addedAt
      })),
      // STATISTICS SUMMARY
      stats: {
        totalEarned: totalEarnings,
        puzzleGameBonuses: user.puzzleGameBonuses || 0,
        tradingBonuses: user.tradingBonuses || 0,
        referralEarnings: user.referralEarnings || 0,
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
        processingWithdrawals: withdrawals.filter(w => w.status === 'processing').length,
        completedWithdrawals: withdrawals.filter(w => w.status === 'completed').length,
        rejectedWithdrawals: withdrawals.filter(w => w.status === 'rejected').length,
        totalTransactions: transactions.length
      }
    };

    console.log('[v0] User details fetched (COMPLETE):', {
      userId: user._id,
      kycStatus: user.kycStatus,
      currentBalance: user.currentBalance,
      totalWithdrawn: user.totalWithdrawn,
      totalEarnings: totalEarnings,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      bankAccounts: bankAccounts.length
    });

    res.json(userDetails);
  } catch (error) {
    console.error('[v0] Error fetching user details:', error);
    res.status(500).json({ message: 'Failed to fetch user details', error: error.message });
  }
});

// Verify/Approve KYC (Real-time status update with permanent persistence)
router.post('/verify-kyc/:userId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { approved, notes } = req.body;
    const adminId = req.user._id || req.user.userId || req.user.id;

    console.log('[v0] Processing KYC decision for user:', req.params.userId, 'Approved:', approved);

    const user = await User.findById(req.params.userId);
    if (!user) {
      console.log('[v0] User not found for KYC:', req.params.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    if (approved) {
      user.kycStatus = 'verified';
      user.kycDocuments = user.kycDocuments || {};
      user.kycDocuments.verifiedAt = new Date();
      user.kycDocuments.verifiedBy = adminId;
      user.kycDocuments.status = 'verified';
      console.log('[v0] KYC APPROVED for user:', user._id);
    } else {
      user.kycStatus = 'rejected';
      user.kycDocuments = user.kycDocuments || {};
      user.kycDocuments.rejectedAt = new Date();
      user.kycDocuments.rejectedBy = adminId;
      user.kycDocuments.status = 'rejected';
      console.log('[v0] KYC REJECTED for user:', user._id);
    }

    if (notes) {
      user.kycDocuments.notes = notes;
    }

    // CRITICAL: Save the user with KYC changes - THIS MUST PERSIST
    const savedUser = await user.save();
    console.log('[v0] KYC decision SAVED to database successfully:', {
      userId: savedUser._id,
      kycStatus: savedUser.kycStatus,
      approvalStatus: approved ? 'VERIFIED' : 'REJECTED',
      timestamp: new Date()
    });

    // TASK 5: Emit Socket.io event for real-time verified users update
    if (router.io) {
      router.io.emit('kyc-updated', {
        _id: savedUser._id,
        kycStatus: savedUser.kycStatus,
        status: savedUser.kycStatus,
        email: savedUser.email,
        fullName: savedUser.fullName,
        kycDocuments: savedUser.kycDocuments
      });
      console.log('[v0] KYC update emitted to admin dashboard via Socket.io');
    }

    res.json({
      message: approved ? 'KYC verified successfully and SAVED' : 'KYC rejected and SAVED',
      success: true,
      kycStatus: savedUser.kycStatus,
      user: {
        _id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        kycStatus: savedUser.kycStatus,
        kycDocuments: savedUser.kycDocuments
      }
    });
  } catch (error) {
    console.error('[v0] Error updating KYC:', error);
    res.status(500).json({ message: 'Failed to update KYC', error: error.message });
  }
});

// Reject deposit - Real-time rejection
router.post('/reject-deposit/:transactionId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    console.log('[v0] Rejecting deposit:', req.params.transactionId, 'Reason:', reason);

    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ message: 'Transaction is not a deposit' });
    }

    // Mark transaction as rejected
    transaction.status = 'rejected';
    transaction.rejectionReason = reason || 'Admin rejection';
    transaction.rejectedBy = req.user.userId || req.user._id;
    transaction.rejectedAt = new Date();
    await transaction.save();

    console.log('[v0] Deposit rejected:', transaction._id);

    // If there's an associated investment, mark it as cancelled
    if (transaction.investmentId) {
      const investment = await Investment.findById(transaction.investmentId);
      if (investment) {
        investment.status = 'cancelled';
        investment.cancelledAt = new Date();
        investment.cancelledBy = req.user.userId || req.user._id;
        await investment.save();
        console.log('[v0] Associated investment cancelled:', investment._id);
      }
    }

    // Update user balance - refund the amount back to their currentBalance
    const user = await User.findById(transaction.userId);
    if (user) {
      user.currentBalance = (user.currentBalance || 0) + transaction.amount;
      await user.save();
      console.log('[BALANCE FINAL CHECK - DEPOSIT REJECT REFUND]', {
        userId: user._id.toString(),
        refundAmount: transaction.amount,
        newCurrentBalance: user.currentBalance,
        message: 'Refund applied to currentBalance (ONLY source of truth)'
      });
    }

    return res.json({
      message: 'Deposit rejected successfully',
      transaction: {
        ...transaction.toObject(),
        status: 'rejected'
      }
    });
  } catch (error) {
    console.error('[v0] Error rejecting deposit:', error);
    res.status(500).json({ message: 'Failed to reject deposit', error: error.message });
  }
});

// Confirm deposit - Real-time activation
router.post('/confirm-deposit/:transactionId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    console.log('[v0] Confirming deposit:', req.params.transactionId);

    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ message: 'Transaction is not a deposit' });
    }

    // Mark transaction as confirmed
    transaction.status = 'confirmed';
    transaction.confirmedBy = req.user.userId || req.user._id;
    transaction.confirmedAt = new Date();

    // Save the transaction - THIS IS CRITICAL FOR PERSISTENCE
    const savedTransaction = await transaction.save();
    console.log('[v0] Deposit confirmed and SAVED to database:', savedTransaction._id, 'Status:', savedTransaction.status);

    console.log('[v0] Activating investment:', transaction.investmentId);

    // Real-time investment activation
    if (transaction.investmentId) {
      const investment = await Investment.findById(transaction.investmentId);
      if (!investment) {
        console.log('[v0] Investment not found:', transaction.investmentId);
        return res.status(404).json({ message: 'Investment not found' });
      }

      // Activate investment immediately - users can trade right away
      investment.status = 'active';
      investment.activatedAt = new Date();
      investment.canTradeAfter = new Date(); // Can trade immediately after activation
      investment.nextReturnDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // First return after 24 hours

      const savedInvestment = await investment.save();
      console.log('[v0] Investment activated successfully and SAVED:', savedInvestment._id);

      // Update user balance and invested amount
      const user = await User.findById(transaction.userId);
      if (user) {
        const balanceBefore = user.currentBalance || 0;
        
        user.totalInvested = (user.totalInvested || 0) + transaction.amount;
        user.currentBalance = Math.max(0, (user.currentBalance || 0) - transaction.amount);

        // Save user changes
        const savedUser = await user.save();
        
        console.log('[BALANCE FINAL CHECK - DEPOSIT CONFIRM]', {
          userId: savedUser._id.toString(),
          investmentAmount: transaction.amount,
          balanceBefore: balanceBefore,
          balanceAfter: savedUser.currentBalance,
          totalInvested: savedUser.totalInvested,
          message: 'Investment confirmed - balance deducted from currentBalance'
        });

        // ========== REFERRAL COMMISSION DISTRIBUTION ==========
        // Distribute referral commissions when investment is confirmed
        const investmentAmount = transaction.amount;

        // Tier 1: 5% to direct referrer
        if (user.referredBy) {
          const tier1Referrer = await User.findById(user.referredBy);
          if (tier1Referrer) {
            const tier1Commission = investmentAmount * 0.05; // 5%

            // Add commission to referrer's balance and earnings
            tier1Referrer.currentBalance = (tier1Referrer.currentBalance || 0) + tier1Commission;
            tier1Referrer.referralEarnings = (tier1Referrer.referralEarnings || 0) + tier1Commission;
            tier1Referrer.totalEarnings = (tier1Referrer.totalEarnings || 0) + tier1Commission;
            tier1Referrer.referralStats = tier1Referrer.referralStats || {};
            tier1Referrer.referralStats.tier1Earnings = (tier1Referrer.referralStats.tier1Earnings || 0) + tier1Commission;

            // Update the referral record for this user
            const referralRecord = tier1Referrer.referrals.find(r => r.userId.toString() === user._id.toString());
            if (referralRecord) {
              referralRecord.totalInvested = (referralRecord.totalInvested || 0) + investmentAmount;
              referralRecord.commissionEarned = (referralRecord.commissionEarned || 0) + tier1Commission;
            }

            // Update active referrals count
            tier1Referrer.referralStats.activeReferrals = tier1Referrer.referrals.filter(r => r.totalInvested > 0).length;

            await tier1Referrer.save();
            console.log('[v0] Tier 1 referral commission paid:', tier1Commission, 'to user:', tier1Referrer._id);

            // Log transaction with balance snapshot
            await transactionLogger.logBalanceTransaction(tier1Referrer._id, 'referral_commission_tier1', tier1Commission, {
              tier: 1,
              percentage: 5,
              referredUserId: user._id,
              investmentAmount: investmentAmount,
              description: `Tier 1 referral commission (5%) from ${user.fullName}`,
              source: 'investment_confirmation'
            });

            // Create transaction record for commission
            await Transaction.create({
              userId: tier1Referrer._id,
              type: 'referral_commission',
              amount: tier1Commission,
              status: 'completed',
              description: 'Tier 1 referral commission (5%) from ' + user.fullName,
              details: {
                tier: 1,
                percentage: 5,
                referredUserId: user._id,
                investmentAmount: investmentAmount
              }
            });

            // Tier 2: 2% to the referrer's referrer
            if (tier1Referrer.referredBy) {
              const tier2Referrer = await User.findById(tier1Referrer.referredBy);
              if (tier2Referrer) {
                const tier2Commission = investmentAmount * 0.02; // 2%

                tier2Referrer.currentBalance = (tier2Referrer.currentBalance || 0) + tier2Commission;
                tier2Referrer.referralEarnings = (tier2Referrer.referralEarnings || 0) + tier2Commission;
                tier2Referrer.totalEarnings = (tier2Referrer.totalEarnings || 0) + tier2Commission;
                tier2Referrer.referralStats = tier2Referrer.referralStats || {};
                tier2Referrer.referralStats.tier2Earnings = (tier2Referrer.referralStats.tier2Earnings || 0) + tier2Commission;

                // Update the referral record
                const tier2RefRecord = tier2Referrer.referrals.find(r => r.userId.toString() === user._id.toString());
                if (tier2RefRecord) {
                  tier2RefRecord.totalInvested = (tier2RefRecord.totalInvested || 0) + investmentAmount;
                  tier2RefRecord.commissionEarned = (tier2RefRecord.commissionEarned || 0) + tier2Commission;
                }

                tier2Referrer.referralStats.activeReferrals = tier2Referrer.referrals.filter(r => r.totalInvested > 0).length;

                await tier2Referrer.save();
                console.log('[v0] Tier 2 referral commission paid:', tier2Commission, 'to user:', tier2Referrer._id);

                // Log transaction with balance snapshot
                await transactionLogger.logBalanceTransaction(tier2Referrer._id, 'referral_commission_tier2', tier2Commission, {
                  tier: 2,
                  percentage: 2,
                  referredUserId: user._id,
                  investmentAmount: investmentAmount,
                  description: `Tier 2 referral commission (2%) from ${user.fullName}`,
                  source: 'investment_confirmation'
                });

                await Transaction.create({
                  userId: tier2Referrer._id,
                  type: 'referral_commission',
                  amount: tier2Commission,
                  status: 'completed',
                  description: 'Tier 2 referral commission (2%) from ' + user.fullName,
                  details: {
                    tier: 2,
                    percentage: 2,
                    referredUserId: user._id,
                    investmentAmount: investmentAmount
                  }
                });

                // Tier 3: 1% to the tier 2 referrer's referrer
                if (tier2Referrer.referredBy) {
                  const tier3Referrer = await User.findById(tier2Referrer.referredBy);
                  if (tier3Referrer) {
                    const tier3Commission = investmentAmount * 0.01; // 1%

                    tier3Referrer.currentBalance = (tier3Referrer.currentBalance || 0) + tier3Commission;
                    tier3Referrer.referralEarnings = (tier3Referrer.referralEarnings || 0) + tier3Commission;
                    tier3Referrer.totalEarnings = (tier3Referrer.totalEarnings || 0) + tier3Commission;
                    tier3Referrer.referralStats = tier3Referrer.referralStats || {};
                    tier3Referrer.referralStats.tier3Earnings = (tier3Referrer.referralStats.tier3Earnings || 0) + tier3Commission;

                    // Update the referral record
                    const tier3RefRecord = tier3Referrer.referrals.find(r => r.userId.toString() === user._id.toString());
                    if (tier3RefRecord) {
                      tier3RefRecord.totalInvested = (tier3RefRecord.totalInvested || 0) + investmentAmount;
                      tier3RefRecord.commissionEarned = (tier3RefRecord.commissionEarned || 0) + tier3Commission;
                    }

                    tier3Referrer.referralStats.activeReferrals = tier3Referrer.referrals.filter(r => r.totalInvested > 0).length;

                    await tier3Referrer.save();
                    console.log('[v0] Tier 3 referral commission paid:', tier3Commission, 'to user:', tier3Referrer._id);

                    // Log transaction with balance snapshot
                    await transactionLogger.logBalanceTransaction(tier3Referrer._id, 'referral_commission_tier3', tier3Commission, {
                      tier: 3,
                      percentage: 1,
                      referredUserId: user._id,
                      investmentAmount: investmentAmount,
                      description: `Tier 3 referral commission (1%) from ${user.fullName}`,
                      source: 'investment_confirmation'
                    });

                    await Transaction.create({
                      userId: tier3Referrer._id,
                      type: 'referral_commission',
                      amount: tier3Commission,
                      status: 'completed',
                      description: 'Tier 3 referral commission (1%) from ' + user.fullName,
                      details: {
                        tier: 3,
                        percentage: 1,
                        referredUserId: user._id,
                        investmentAmount: investmentAmount
                      }
                    });
                  }
                }
              }
            }
          }
        }
        // ========== END REFERRAL COMMISSION DISTRIBUTION ==========
      }

      // Return comprehensive response with activation details
      return res.json({
        message: 'Deposit confirmed and investment activated in real-time',
        transaction: {
          ...transaction.toObject(),
          investmentActivated: true,
          investmentId: savedInvestment._id,
          activatedAt: savedInvestment.activatedAt,
          status: savedInvestment.status
        }
      });
    }

    res.json({ message: 'Deposit confirmed', transaction });
  } catch (error) {
    console.error('[v0] Error confirming deposit:', error);
    res.status(500).json({ message: 'Failed to confirm deposit', error: error.message });
  }
});

// Get all withdrawals (Real-time withdrawal management)
router.get('/withdrawals', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let filter = { type: 'withdrawal' };

    if (status) filter.status = status;

    console.log('[v0] Admin fetching withdrawals - Status:', status, 'Page:', page);

    const withdrawals = await Transaction.find(filter)
      .populate('userId', 'fullName email balance')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Transaction.countDocuments(filter);

    const enrichedWithdrawals = withdrawals.map(w => ({
      _id: w._id,
      userId: w.userId,
      amount: w.amount,
      currency: w.currency,
      method: w.method,
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      rejectionReason: w.rejectionReason,
      walletId: w.walletId,
      bankAccountId: w.bankAccountId
    }));

    console.log('[v0] Fetched', enrichedWithdrawals.length, 'withdrawal requests');

    res.json({
      withdrawals: enrichedWithdrawals,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      stats: {
        pending: withdrawals.filter(w => w.status === 'pending').length,
        completed: withdrawals.filter(w => w.status === 'completed').length,
        rejected: withdrawals.filter(w => w.status === 'rejected').length
      }
    });
  } catch (error) {
    console.error('[v0] Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals', error: error.message });
  }
});

// Approve/Process payout (Real-time withdrawal approval)
// CRITICAL: This CONFIRMS the withdrawal - money was already debited when user requested
// Admin is confirming they have paid the user externally (crypto, bank, etc.)
router.post('/payout/:transactionId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    console.log('[v0] Processing payout for transaction:', req.params.transactionId);

    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ message: 'Transaction is not a withdrawal' });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ message: 'Withdrawal already completed' });
    }

    // Mark transaction as completed - DO NOT REFUND MONEY
    // The user's balance was already deducted when they requested the withdrawal
    transaction.status = 'completed';
    transaction.withdrawalStatus = 'completed';
    transaction.completedAt = new Date();
    transaction.paidOutAt = new Date();
    transaction.processedBy = req.user._id || req.user.userId;
    await transaction.save();

    // Update user's totalWithdrawn stat (funds were already debited, this is just tracking)
    const user = await User.findById(transaction.userId);
    if (user) {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + transaction.amount;
      await user.save();
      console.log('[v0] User totalWithdrawn updated:', user._id, 'Amount:', transaction.amount, 'Total:', user.totalWithdrawn);
    }

    // Populate user data for Socket.io event
    await transaction.populate('userId', 'fullName email');

    // Emit Socket.io event for real-time withdrawal update
    if (router.io && transaction.userId) {
      const roomId = `user_${transaction.userId._id}`;
      router.io.to(roomId).emit('withdrawal-completed', {
        _id: transaction._id,
        userId: {
          _id: transaction.userId._id,
          fullName: transaction.userId.fullName,
          email: transaction.userId.email
        },
        amount: transaction.amount,
        walletAddress: transaction.walletAddress,
        walletType: transaction.walletType,
        status: transaction.status,
        withdrawalStatus: transaction.withdrawalStatus,
        completedAt: transaction.completedAt
      });
      console.log(`[Socket.io] Withdrawal COMPLETED emitted to room: ${roomId}`);
    }

    console.log('[v0] Withdrawal CONFIRMED and COMPLETED:', transaction._id, 'Amount:', transaction.amount);

    res.json({
      message: 'Withdrawal confirmed - User funds permanently debited',
      success: true,
      transaction: {
        _id: transaction._id,
        status: 'completed',
        amount: transaction.amount,
        processedAt: transaction.completedAt
      }
    });
  } catch (error) {
    console.error('[v0] Error processing payout:', error);
    res.status(500).json({ message: 'Failed to process payout', error: error.message });
  }
});

// Reject withdrawal (Real-time withdrawal rejection)
// CRITICAL: This REJECTS the withdrawal - money must be REFUNDED to user
// Because funds were already debited when user requested the withdrawal
router.post('/reject-withdrawal/:transactionId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    console.log('[v0] Rejecting withdrawal:', req.params.transactionId, 'Reason:', reason);

    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ message: 'Transaction is not a withdrawal' });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ message: 'Cannot reject a completed withdrawal' });
    }

    if (transaction.status === 'rejected') {
      return res.status(400).json({ message: 'Withdrawal already rejected' });
    }

    transaction.status = 'rejected';
    transaction.withdrawalStatus = 'rejected';
    transaction.rejectionReason = reason || 'Admin rejection';
    transaction.rejectedBy = req.user._id || req.user.userId;
    transaction.rejectedAt = new Date();
    await transaction.save();

    // CRITICAL: Refund balance to user - funds were debited at request time
    const user = await User.findById(transaction.userId);
    if (user) {
      const balanceBefore = user.currentBalance;
      user.currentBalance = (user.currentBalance || 0) + transaction.amount;
      await user.save();
      console.log('[v0] Withdrawal REJECTED - User REFUNDED:', {
        userId: user._id,
        amount: transaction.amount,
        balanceBefore,
        balanceAfter: user.currentBalance
      });
    }

    // Emit Socket.io event for rejection
    if (router.io && transaction.userId) {
      const roomId = `user_${transaction.userId}`;
      router.io.to(roomId).emit('withdrawal-rejected', {
        _id: transaction._id,
        amount: transaction.amount,
        status: 'rejected',
        rejectionReason: transaction.rejectionReason
      });
    }

    res.json({
      message: 'Withdrawal rejected - Funds refunded to user',
      success: true,
      refundedAmount: transaction.amount,
      transaction: {
        _id: transaction._id,
        status: 'rejected',
        rejectionReason: transaction.rejectionReason
      }
    });
  } catch (error) {
    console.error('[v0] Error rejecting withdrawal:', error);
    res.status(500).json({ message: 'Failed to reject withdrawal', error: error.message });
  }
});

// Remove suspected user
router.post('/remove-user/:userId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'blocked';
    user.suspicionFlags.push(reason);
    await user.save();

    res.json({ message: 'User blocked successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove user', error: error.message });
  }
});

// Get platform stats
router.get('/stats', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    // Total platform users
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const kycVerifiedUsers = await User.countDocuments({ kycStatus: 'verified' });
    
    // CRITICAL FIX: totalInvested = amount users invested that they can withdraw
    // This is the sum of all investment amounts (principal that must be fully withdrawable)
    const totalInvestmentData = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalInvested = totalInvestmentData[0]?.total || 0;
    
    // totalEarnings = actual earnings from investments (interest/returns earned)
    const totalEarningsData = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$totalReturnsEarned' } } }
    ]);
    const totalEarnings = totalEarningsData[0]?.total || 0;
    
    // Get all users' current balance
    const allUsers = await User.find({}, 'currentBalance');
    const totalPlatformBalance = allUsers.reduce((sum, user) => sum + (user.currentBalance || 0), 0);
    
    // Count pending transactions
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
    
    console.log('[ADMIN STATS - FINANCIAL SUMMARY]', {
      totalInvested: totalInvested,
      totalEarnings: totalEarnings,
      totalPlatformBalance: totalPlatformBalance,
      message: 'Financial Summary matches User Wallet: totalInvested is fully withdrawable'
    });

    res.json({
      totalUsers,
      verifiedUsers,
      kycVerifiedUsers,
      totalInvested: totalInvested, // Full amount users invested - fully withdrawable
      totalEarnings: totalEarnings, // Earnings from investments
      totalPlatformBalance: totalPlatformBalance, // Current balance on platform
      pendingTransactions,
      financialSummary: {
        totalInvestedCapital: totalInvested,
        totalEarningsFromInvestments: totalEarnings,
        totalCurrentBalance: totalPlatformBalance,
        note: 'totalInvestedCapital is 100% withdrawable by users'
      }
    });
  } catch (error) {
    console.error('[v0] Admin stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Get all pending deposits (pending view only)
router.get('/deposits/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const deposits = await Transaction.find({
      type: 'deposit',
      status: 'pending'
    }).populate('userId', 'fullName email').sort('-createdAt');

    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending deposits', error: error.message });
  }
});

// Get all deposits (including confirmed and rejected for admin audit/history)
router.get('/deposits/all', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const deposits = await Transaction.find({
      type: 'deposit'
    }).populate('userId', 'fullName email').sort('-createdAt');

    console.log('[v0] Admin fetched all deposits - Total:', deposits.length);
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all deposits', error: error.message });
  }
});

// Get all pending withdrawals
router.get('/withdrawals', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      type: 'withdrawal'
    })
      .populate('userId', 'fullName email')
      .sort('-createdAt');

    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch withdrawals', error: error.message });
  }
});

// Update withdrawal status with real-time Socket.io emit
// CRITICAL: When marking as 'completed', funds are permanently debited (already happened at request)
// This route updates status tracking but doesn't move money around
router.put('/withdrawals/:id/status', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { newStatus, paymentMethod, paymentNotes } = req.body;

    if (!['pending', 'processing', 'completed'].includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    if (transaction.status === 'completed' && newStatus !== 'completed') {
      return res.status(400).json({ message: 'Cannot change status of completed withdrawal' });
    }

    transaction.withdrawalStatus = newStatus;
    transaction.status = newStatus;
    transaction.processedBy = req.user._id || req.user.userId;

    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (paymentNotes) transaction.paymentNotes = paymentNotes;
    if (newStatus === 'processing') transaction.processedAt = new Date();
    if (newStatus === 'completed') {
      transaction.paidOutAt = new Date();
      transaction.completedAt = new Date();

      // Update user's totalWithdrawn stat when completing
      const user = await User.findById(transaction.userId);
      if (user) {
        user.totalWithdrawn = (user.totalWithdrawn || 0) + transaction.amount;
        // CRITICAL: Save user changes to database
        const savedUser = await user.save();
        console.log('[v0] Withdrawal COMPLETED - totalWithdrawn updated and SAVED:', savedUser._id);
      }
    }

    // CRITICAL: Save the transaction status change to database
    const savedTransaction = await transaction.save();
    console.log('[v0] Withdrawal status updated and SAVED to database:', {
      transactionId: savedTransaction._id,
      oldStatus: transaction.status,
      newStatus: savedTransaction.status,
      timestamp: new Date()
    });

    // Emit Socket.io event for real-time update to all admins and the user
    if (router.io) {
      const roomId = `user_${transaction.userId}`;
      const eventName = newStatus === 'completed' ? 'withdrawal-completed' : 'withdrawal-updated';

      // Fetch user info for emit
      const user = await User.findById(transaction.userId).select('fullName email');

      router.io.to(roomId).emit(eventName, {
        _id: savedTransaction._id,
        userId: user ? {
          _id: user._id,
          fullName: user.fullName,
          email: user.email
        } : transaction.userId,
        amount: savedTransaction.amount,
        walletAddress: savedTransaction.walletAddress,
        walletType: savedTransaction.walletType,
        status: savedTransaction.status,
        withdrawalStatus: savedTransaction.withdrawalStatus,
        processedAt: savedTransaction.processedAt,
        paidOutAt: savedTransaction.paidOutAt,
        paymentMethod: savedTransaction.paymentMethod
      });
      console.log(`[Socket.io] Withdrawal status updated to ${newStatus}, emitted ${eventName} to room: ${roomId}`);
    }

    res.json({
      message: `Withdrawal marked as ${newStatus}${newStatus === 'completed' ? ' - Funds permanently debited' : ''}`,
      transaction: {
        _id: savedTransaction._id,
        status: savedTransaction.status,
        withdrawalStatus: savedTransaction.withdrawalStatus,
        processedAt: savedTransaction.processedAt,
        paidOutAt: savedTransaction.paidOutAt
      }
    });
  } catch (error) {
    console.error('[v0] Error updating withdrawal status:', error);
    res.status(500).json({ message: 'Failed to update withdrawal status', error: error.message });
  }
});


// Get pending KYC
router.get('/kyc/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending KYC', error: error.message });
  }
});

// Get all KYC submissions (including verified and rejected for audit trail)
router.get('/kyc/all', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { kycStatus: 'pending' },
        { kycStatus: 'verified' },
        { kycStatus: 'rejected' }
      ]
    })
      .select('-password')
      .sort('-updatedAt');

    console.log('[v0] Admin fetched all KYC submissions - Total:', users.length);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all KYC submissions', error: error.message });
  }
});

// Get user wallets
router.get('/wallets', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('userId', 'fullName email');

    res.json(wallets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wallets', error: error.message });
  }
});

// ===== WITHDRAWAL MANAGEMENT ROUTES =====

// Get pending withdrawals (for quick admin action)
router.get('/withdrawals/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      type: 'withdrawal',
      withdrawalStatus: 'pending'
    })
      .populate('userId', 'fullName email phone walletAddresses')
      .sort('-createdAt')
      .lean();

    console.log('[v0] Fetched pending withdrawals - Count:', withdrawals.length);
    res.json(withdrawals);
  } catch (error) {
    console.error('[v0] Error fetching pending withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch pending withdrawals', error: error.message });
  }
});

// Get all withdrawals including history (for audit trail)
router.get('/withdrawals/all', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const withdrawals = await Transaction.find({
      type: 'withdrawal'
    })
      .populate('userId', 'fullName email')
      .sort('-createdAt')
      .lean();

    console.log('[v0] Admin fetched all withdrawals with history - Total:', withdrawals.length);
    res.json(withdrawals);
  } catch (error) {
    console.error('[v0] Error fetching all withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch all withdrawals', error: error.message });
  }
});

// Get all withdrawals (with filtering)
router.get('/withdrawals', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { status = 'all', limit = 50, page = 1 } = req.query;

    let filter = { type: 'withdrawal' };
    if (status !== 'all') {
      filter.withdrawalStatus = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Transaction.find(filter)
      .populate('userId', 'fullName email phone walletAddresses currentBalance')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Transaction.countDocuments(filter);

    res.json({
      withdrawals,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch withdrawals', error: error.message });
  }
});

// Update withdrawal status (Pending → Processing → Completed)
// CRITICAL: When completing, funds are permanently debited (already deducted at request time)
router.post('/withdrawals/:transactionId/status', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { newStatus, paymentMethod, paymentNotes } = req.body;

    if (!['pending', 'processing', 'completed'].includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid withdrawal status' });
    }

    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    if (transaction.status === 'completed') {
      return res.status(400).json({ message: 'Withdrawal already completed' });
    }

    transaction.withdrawalStatus = newStatus;
    transaction.processedBy = req.user.userId || req.user._id;
    transaction.processedAt = new Date();

    if (newStatus === 'completed') {
      transaction.paidOutAt = new Date();
      transaction.completedAt = new Date();
      transaction.status = 'completed';

      // Update user's totalWithdrawn stat
      const user = await User.findById(transaction.userId);
      if (user) {
        user.totalWithdrawn = (user.totalWithdrawn || 0) + transaction.amount;
        await user.save();
        console.log('[v0] Withdrawal COMPLETED - User totalWithdrawn updated:', user._id, 'Amount:', transaction.amount);
      }
    } else if (newStatus === 'processing') {
      transaction.status = 'processing';
    }

    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (paymentNotes) transaction.paymentNotes = paymentNotes;

    await transaction.save();

    res.json({
      message: `Withdrawal marked as ${newStatus}${newStatus === 'completed' ? ' - Funds permanently debited' : ''}`,
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update withdrawal status', error: error.message });
  }
});

// ===== USER MANAGEMENT ROUTES =====

// Flag a user
router.post('/users/:userId/flag', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Flag reason is required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'flagged';
    user.flaggedAt = new Date();
    user.flaggedBy = req.user.userId || req.user._id;
    user.flagReason = reason;

    user.userActions.push({
      type: 'flag',
      reason,
      actionTakenBy: req.user.userId || req.user._id,
      notes: `User flagged with reason: ${reason}`
    });

    await user.save();

    res.json({ message: 'User flagged successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to flag user', error: error.message });
  }
});

// Suspend a user
router.post('/users/:userId/suspend', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Suspension reason is required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'suspended';
    user.suspendedAt = new Date();
    user.suspendedBy = req.user.userId || req.user._id;
    user.suspensionReason = reason;
    user.suspicionFlags.push(reason);

    user.userActions.push({
      type: 'suspend',
      reason,
      actionTakenBy: req.user.userId || req.user._id,
      notes: `User suspended with reason: ${reason}`
    });

    await user.save();

    res.json({ message: 'User suspended successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to suspend user', error: error.message });
  }
});

// Delete a user (soft delete)
router.post('/users/:userId/delete', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Deletion reason is required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'deleted';
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user.userId || req.user._id;
    user.deletionReason = reason;

    user.userActions.push({
      type: 'delete',
      reason,
      actionTakenBy: req.user.userId || req.user._id,
      notes: `User deleted with reason: ${reason}`
    });

    await user.save();

    res.json({ message: 'User deleted successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

// Restore a user (undo deletion/suspension)
router.post('/users/:userId/restore', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'active';
    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;
    user.suspendedAt = null;
    user.suspendedBy = null;
    user.flaggedAt = null;
    user.flaggedBy = null;

    user.userActions.push({
      type: 'restore',
      reason: reason || 'User restored by admin',
      actionTakenBy: req.user.userId || req.user._id,
      notes: `User restored to active status`
    });

    await user.save();

    res.json({ message: 'User restored successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore user', error: error.message });
  }
});

// Get flagged/suspended/deleted users
router.get('/users/status/:status', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 50, page = 1 } = req.query;

    if (!['flagged', 'suspended', 'deleted', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find({ status })
      .select('-password')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments({ status });

    res.json({
      users,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users by status', error: error.message });
  }
});

// Get real-time user balance (Admin view)
router.get('/users/:userId/balance', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activeInvestments = await Investment.find({
      userId: req.params.userId,
      status: 'active',
      isWithdrawn: false
    });

    let totalLockedInTrades = 0;
    activeInvestments.forEach(inv => {
      if (inv.tradeInProgress) {
        totalLockedInTrades += inv.lockedAmount || 0;
      }
    });

    const pendingWithdrawals = await Transaction.find({
      userId: req.params.userId,
      type: 'withdrawal',
      status: 'pending'
    });

    let totalPendingWithdrawal = 0;
    pendingWithdrawals.forEach(tx => {
      totalPendingWithdrawal += tx.amount || 0;
    });

    const availableBalance = Math.max(0, user.currentBalance - totalLockedInTrades - totalPendingWithdrawal);

    res.json({
      userId: req.params.userId,
      email: user.email,
      totalBalance: user.currentBalance,
      availableBalance: availableBalance,
      lockedInTrades: totalLockedInTrades,
      pendingWithdrawal: totalPendingWithdrawal,
      totalEarnings: user.totalEarnings || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
      powaUpBalance: user.powaUpBalance || 0,
      activeInvestments: activeInvestments.length,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('[admin] Error getting user balance:', error);
    res.status(500).json({ message: 'Failed to fetch balance', error: error.message });
  }
});

// Get withdrawal log with filters
router.get('/transactions/withdrawals', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const skip = page * limit;

    let query = { type: 'withdrawal' };
    if (req.query.status) query.status = req.query.status;
    if (req.query.userId) query.userId = req.query.userId;

    const withdrawals = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email firstName lastName');

    const total = await Transaction.countDocuments(query);

    res.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[admin] Error getting withdrawal log:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawal log', error: error.message });
  }
});

// Get PowaUp purchase log
router.get('/transactions/powaup-purchases', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const skip = page * limit;

    let query = { type: 'powaup_purchase' };
    if (req.query.userId) query.userId = req.query.userId;

    const purchases = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email firstName lastName');

    const total = await Transaction.countDocuments(query);

    res.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[admin] Error getting PowaUp purchase log:', error);
    res.status(500).json({ message: 'Failed to fetch purchase log', error: error.message });
  }
});

// Get dashboard metrics
router.get('/dashboard/metrics', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

    const withdrawals = await Transaction.find({
      type: 'withdrawal',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const powaupSales = await Transaction.find({
      type: 'powaup_purchase',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalWithdrawn = withdrawals.reduce((sum, tx) => sum + tx.amount, 0);
    const totalPowaUpSales = powaupSales.reduce((sum, tx) => sum + tx.amount, 0);

    res.json({
      totalUsers,
      activeUsers,
      withdrawalCount: withdrawals.length,
      totalWithdrawn,
      powaupSalesCount: powaupSales.length,
      totalPowaUpSales,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[admin] Error getting metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics', error: error.message });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const pendingWithdrawals = await Transaction.find({
      type: 'withdrawal',
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'email firstName lastName');

    res.json({
      count: pendingWithdrawals.length,
      withdrawals: pendingWithdrawals
    });
  } catch (error) {
    console.error('[admin] Error getting pending withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch pending withdrawals', error: error.message });
  }
});

// Approve withdrawal
router.patch('/transactions/:transactionId/approve', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'approved';
    transaction.approvedAt = new Date();
    transaction.approvedBy = req.user.userId;
    await transaction.save();

    res.json({
      message: 'Withdrawal approved',
      transaction
    });
  } catch (error) {
    console.error('[admin] Error approving withdrawal:', error);
    res.status(500).json({ message: 'Failed to approve withdrawal', error: error.message });
  }
});

// Complete withdrawal (mark as paid)
router.patch('/transactions/:transactionId/complete', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.completedBy = req.user.userId;
    await transaction.save();

    res.json({
      message: 'Withdrawal completed',
      transaction
    });
  } catch (error) {
    console.error('[admin] Error completing withdrawal:', error);
    res.status(500).json({ message: 'Failed to complete withdrawal', error: error.message });
  }
});

// Get user cash flow summary
router.get('/users/:userId/cash-flow', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const transactions = await Transaction.find({
      userId: req.params.userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });

    res.json({
      userId: req.params.userId,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        inflow: transactions.filter(t => t.type === 'returns').reduce((sum, t) => sum + t.amount, 0),
        outflow: transactions.filter(t => t.type === 'withdrawal' || t.type === 'powaup_purchase').reduce((sum, t) => sum + t.amount, 0)
      }
    });
  } catch (error) {
    console.error('[admin] Error tracking cash flow:', error);
    res.status(500).json({ message: 'Failed to fetch cash flow', error: error.message });
  }
});

// Get user summary
router.get('/users/:userId/summary', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const investments = await Investment.find({ userId: req.params.userId });
    const transactions = await Transaction.find({ userId: req.params.userId });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentBalance: user.currentBalance,
        totalEarnings: user.totalEarnings || 0,
        totalWithdrawn: user.totalWithdrawn || 0,
        powaUpBalance: user.powaUpBalance || 0,
        status: user.status,
        createdAt: user.createdAt
      },
      investments: {
        count: investments.length,
        active: investments.filter(i => i.status === 'active').length,
        completed: investments.filter(i => i.status === 'completed').length,
        total: investments.reduce((sum, i) => sum + i.amount, 0),
        earnings: investments.reduce((sum, i) => sum + i.totalReturnsEarned, 0)
      },
      transactions: {
        count: transactions.length,
        withdrawals: transactions.filter(t => t.type === 'withdrawal').length,
        powaupPurchases: transactions.filter(t => t.type === 'powaup_purchase').length,
        returns: transactions.filter(t => t.type === 'returns').length
      }
    });
  } catch (error) {
    console.error('[admin] Error getting user summary:', error);
    res.status(500).json({ message: 'Failed to fetch user summary', error: error.message });
  }
});

// Grant PowaUp credits to a user
router.post('/grant-powaup/:userId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid PowaUp amount. Must be a positive number.' });
    }

    // Prevent granting more than 100000 PowaUp at once
    if (amount > 100000) {
      return res.status(400).json({ message: 'Cannot grant more than 100,000 PowaUp at once' });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update PowaUp balance
    const previousBalance = user.powaUpBalance || 0;
    user.powaUpBalance = (user.powaUpBalance || 0) + amount;
    await user.save();

    console.log('[v0] Admin granted PowaUp - User:', userId, 'Amount:', amount, 'Previous Balance:', previousBalance, 'New Balance:', user.powaUpBalance);

    res.json({
      message: `Successfully granted ${amount} PowaUp to user`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        previousBalance,
        newBalance: user.powaUpBalance,
        amountGranted: amount
      }
    });
  } catch (error) {
    console.error('[v0] Error granting PowaUp:', error);
    res.status(500).json({ message: 'Failed to grant PowaUp', error: error.message });
  }
});

// Find user by 6-digit userCode
router.get('/find-user-by-code/:userCode', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userCode } = req.params;

    // Validate userCode format (6 digits)
    if (!userCode || userCode.length !== 6 || !/^\d{6}$/.test(userCode)) {
      return res.status(400).json({ message: 'Invalid user code format. Must be 6 digits.' });
    }

    // Find user by code
    const user = await User.findOne({ userCode });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this code' });
    }

    console.log('[v0] Admin found user by code:', userCode);

    res.json({
      message: 'User found',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode,
        powaUpBalance: user.powaUpBalance || 0
      }
    });
  } catch (error) {
    console.error('[v0] Error finding user by code:', error);
    res.status(500).json({ message: 'Failed to find user', error: error.message });
  }
});

// Grant PowaUp by user's 6-digit code
router.post('/grant-powaup-by-code/:userCode', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userCode } = req.params;
    const { amount } = req.body;

    // Validate userCode
    if (!userCode || userCode.length !== 6 || !/^\d{6}$/.test(userCode)) {
      return res.status(400).json({ message: 'Invalid user code format. Must be 6 digits.' });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'Invalid PowaUp amount. Must be a positive number.' });
    }

    if (amount > 100000) {
      return res.status(400).json({ message: 'Cannot grant more than 100,000 PowaUp at once' });
    }

    // Find user by code
    const user = await User.findOne({ userCode });

    if (!user) {
      return res.status(404).json({ message: 'User not found with code: ' + userCode });
    }

    // Update PowaUp balance
    const previousBalance = user.powaUpBalance || 0;
    user.powaUpBalance = (user.powaUpBalance || 0) + amount;
    await user.save();

    console.log('[v0] Admin granted PowaUp by code - Code:', userCode, 'User:', user._id, 'Amount:', amount);

    res.json({
      message: `Successfully granted ${amount} PowaUp to ${user.fullName}`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode,
        previousBalance,
        newBalance: user.powaUpBalance,
        amountGranted: amount
      }
    });
  } catch (error) {
    console.error('[v0] Error granting PowaUp by code:', error);
    res.status(500).json({ message: 'Failed to grant PowaUp', error: error.message });
  }
});

// Grant USD to a user by their 6-digit code (REAL-TIME CREDIT)
router.post('/grant-usd', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { userCode, amount } = req.body;
    const adminId = req.user?._id || req.user?.userId;

    if (!userCode || !amount) {
      return res.status(400).json({ message: 'userCode and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // Prevent granting massive amounts at once
    if (amount > 100000) {
      return res.status(400).json({ message: 'Cannot grant more than $100,000 USD at once' });
    }

    // Find user by userCode
    const user = await User.findOne({ userCode });
    if (!user) {
      return res.status(404).json({ message: `User with code ${userCode} not found` });
    }

    const previousBalance = user.currentBalance || 0;

    // ATOMIC: Add funds to user balance
    user.currentBalance = (user.currentBalance || 0) + amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      type: 'admin_credit',
      amount: amount,
      currency: 'USD',
      status: 'completed',
      confirmedAt: new Date(),
      description: `Admin granted $${amount} USD`,
      details: {
        grantedBy: adminId,
        grantedTo: user.userCode,
        reason: 'Admin credit',
        timestamp: new Date()
      }
    });

    console.log('[v0] Admin granted USD - Code:', userCode, 'User:', user._id, 'Amount:', amount, 'Previous Balance:', previousBalance, 'New Balance:', user.currentBalance);

    // Log to transaction logger for audit trail
    await transactionLogger.logBalanceTransaction(user._id, 'admin_usd_grant', amount, {
      grantedBy: adminId,
      previousBalance: previousBalance,
      newBalance: user.currentBalance,
      transactionId: transaction._id
    });

    // Emit real-time socket event if socket.io is available
    if (router.io) {
      router.io.emit('admin-balance-updated', {
        userId: user._id.toString(),
        userCode: user.userCode,
        newBalance: user.currentBalance,
        creditAmount: amount,
        type: 'admin_usd_grant'
      });

      // Also emit to the specific user's room if connected
      router.io.to(`user-${user._id.toString()}`).emit('balance-updated', {
        currentBalance: user.currentBalance,
        source: 'admin_grant'
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully granted $${amount} USD to ${user.fullName}`,
      user: {
        _id: user._id,
        userCode: user.userCode,
        fullName: user.fullName,
        email: user.email,
        previousBalance: previousBalance,
        newBalance: user.currentBalance,
        creditAmount: amount
      },
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    });

  } catch (error) {
    console.error('[v0] Error granting USD:', error);
    res.status(500).json({ message: 'Failed to grant USD', error: error.message });
  }
});

export default router;
