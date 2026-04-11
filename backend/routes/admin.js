import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import Admin from '../models/Admin.js';
import Wallet from '../models/Wallet.js';

const router = express.Router();

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

// Get user details with withdrawals, KYC, and bank accounts (Real-time)
router.get('/users/:id', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    console.log('[v0] Admin fetching user details:', req.params.id);
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch all related data in parallel
    const [investments, wallet, transactions, bankAccounts] = await Promise.all([
      Investment.find({ userId: user._id }),
      Wallet.findOne({ userId: user._id }),
      Transaction.find({ userId: user._id }),
      User.findById(user._id).select('bankAccounts').then(u => u?.bankAccounts || [])
    ]);
    
    // Separate transactions by type
    const withdrawals = transactions.filter(t => t.type === 'withdrawal');
    const deposits = transactions.filter(t => t.type === 'deposit');
    
    const userDetails = {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        status: user.status || 'active',
        kycStatus: user.kycStatus || 'not-submitted',
        kycDocuments: user.kycDocuments,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
        investmentCount: investments.length,
        totalInvested: investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      },
      investments: investments.map(inv => ({
        _id: inv._id,
        amount: inv.amount,
        package: inv.package,
        status: inv.status,
        activatedAt: inv.activatedAt,
        dailyReturnPercent: inv.dailyReturnPercent
      })),
      withdrawals: withdrawals.map(w => ({
        _id: w._id,
        amount: w.amount,
        currency: w.currency,
        method: w.method,
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
        rejectionReason: w.rejectionReason
      })),
      deposits: deposits.map(d => ({
        _id: d._id,
        amount: d.amount,
        currency: d.currency,
        status: d.status,
        receiptUrl: d.receiptUrl,
        createdAt: d.createdAt,
        confirmedAt: d.confirmedAt
      })),
      bankAccounts: bankAccounts.map(ba => ({
        _id: ba._id,
        accountHolder: ba.accountHolder,
        accountNumber: ba.accountNumber,
        bankName: ba.bankName,
        currency: ba.currency,
        status: ba.status,
        addedAt: ba.addedAt
      })),
      wallet: wallet,
      stats: {
        totalEarned: user.puzzleGameBonuses + user.tradingBonuses + user.referralEarnings,
        puzzleGameBonuses: user.puzzleGameBonuses,
        tradingBonuses: user.tradingBonuses,
        referralEarnings: user.referralEarnings,
        pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
        completedWithdrawals: withdrawals.filter(w => w.status === 'completed').length,
        rejectedWithdrawals: withdrawals.filter(w => w.status === 'rejected').length
      }
    };
    
    console.log('[v0] User details fetched:', {
      userId: user._id,
      kycStatus: user.kycStatus,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      bankAccounts: bankAccounts.length
    });
    
    res.json(userDetails);
  } catch (error) {
    console.error('[v0] Error fetching user details:', error);
    res.status(500).json({ message: 'Failed to fetch user details', error: error.message });
  }
});

// Verify/Approve KYC (Real-time status update)
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
    
    await user.save();
    
    console.log('[v0] KYC decision saved successfully:', {
      userId: user._id,
      kycStatus: user.kycStatus,
      timestamp: new Date()
    });
    
    res.json({ 
      message: approved ? 'KYC verified successfully' : 'KYC rejected',
      success: true,
      kycStatus: user.kycStatus,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        kycStatus: user.kycStatus,
        kycDocuments: user.kycDocuments
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
    
    // Update user balance - refund the amount back to their balance
    const user = await User.findById(transaction.userId);
    if (user) {
      user.balance = (user.balance || 0) + transaction.amount;
      await user.save();
      console.log('[v0] User refunded:', user._id, 'Amount:', transaction.amount);
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
    await transaction.save();
    
    console.log('[v0] Deposit confirmed, activating investment:', transaction.investmentId);
    
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
      console.log('[v0] Investment activated successfully:', savedInvestment._id);
      
      // Update user balance and invested amount
      const user = await User.findById(transaction.userId);
      if (user) {
        user.totalInvested = (user.totalInvested || 0) + transaction.amount;
        user.currentBalance = (user.currentBalance || 0) - transaction.amount;
        await user.save();
        console.log('[v0] User balance updated:', user._id);
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
    
    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.processedBy = req.user._id || req.user.userId;
    await transaction.save();
    
    console.log('[v0] Withdrawal completed:', transaction._id);
    
    res.json({ 
      message: 'Withdrawal processed successfully',
      success: true,
      transaction: {
        _id: transaction._id,
        status: 'completed',
        processedAt: transaction.completedAt
      }
    });
  } catch (error) {
    console.error('[v0] Error processing payout:', error);
    res.status(500).json({ message: 'Failed to process payout', error: error.message });
  }
});

// Reject withdrawal (Real-time withdrawal rejection)
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
    
    transaction.status = 'rejected';
    transaction.rejectionReason = reason || 'Admin rejection';
    transaction.rejectedBy = req.user._id || req.user.userId;
    transaction.rejectedAt = new Date();
    await transaction.save();
    
    // Refund balance to user
    const user = await User.findById(transaction.userId);
    if (user) {
      user.balance = (user.balance || 0) + transaction.amount;
      await user.save();
      console.log('[v0] Withdrawal rejected and user refunded:', user._id);
    }
    
    res.json({ 
      message: 'Withdrawal rejected successfully',
      success: true,
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
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const kycVerifiedUsers = await User.countDocuments({ kycStatus: 'verified' });
    const totalInvested = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalEarnings = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: '$totalReturnsEarned' } } }
    ]);
    
    const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
    
    res.json({
      totalUsers,
      verifiedUsers,
      kycVerifiedUsers,
      totalInvested: totalInvested[0]?.total || 0,
      totalEarnings: totalEarnings[0]?.total || 0,
      pendingTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Get pending deposits
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

// Get pending KYC
router.get('/kyc/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending KYC', error: error.message });
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

// Get pending withdrawals
router.get('/withdrawals/pending', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const withdrawals = await Transaction.find({ 
      type: 'withdrawal', 
      withdrawalStatus: 'pending'
    })
      .populate('userId', 'fullName email phone walletAddresses')
      .sort('-createdAt');
    
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending withdrawals', error: error.message });
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
    
    transaction.withdrawalStatus = newStatus;
    transaction.processedBy = req.user.userId || req.user._id;
    transaction.processedAt = new Date();
    
    if (newStatus === 'completed') {
      transaction.paidOutAt = new Date();
      transaction.status = 'completed';
    } else if (newStatus === 'processing') {
      transaction.status = 'processing';
    }
    
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (paymentNotes) transaction.paymentNotes = paymentNotes;
    
    await transaction.save();
    
    res.json({ message: `Withdrawal marked as ${newStatus}`, transaction });
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

export default router;
