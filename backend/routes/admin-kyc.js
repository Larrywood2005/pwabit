import express from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to check if user is admin (you may need to update this based on your auth structure)
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authorization error', error: error.message });
  }
};

// Get all pending KYC submissions
router.get('/submissions', authenticate, adminOnly, async (req, res) => {
  try {
    const { status = 'pending', limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { kycStatus: status };
    if (status === 'all') {
      query = {}; // Get all regardless of status
    }
    
    const submissions = await User.find(query)
      .select('_id fullName email kycStatus kycData kycRequired currentBalance createdAt')
      .sort({ 'kycData.submittedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      submissions: submissions.map(user => ({
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        kycStatus: user.kycStatus,
        kycData: user.kycData,
        currentBalance: user.currentBalance,
        submittedAt: user.kycData?.submittedAt,
        createdAt: user.createdAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch KYC submissions', error: error.message });
  }
});

// Get KYC submission details
router.get('/submission/:userId', authenticate, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('_id fullName email kycStatus kycData kycRequired currentBalance createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      kycStatus: user.kycStatus,
      kycData: user.kycData,
      currentBalance: user.currentBalance,
      kycRequired: user.kycRequired,
      submittedAt: user.kycData?.submittedAt,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch KYC submission', error: error.message });
  }
});

// Approve KYC
router.post('/approve/:userId', authenticate, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.kycData || !user.kycData.submittedAt) {
      return res.status(400).json({ message: 'No KYC submission found for this user' });
    }
    
    user.kycStatus = 'approved';
    user.kycData.approvedAt = new Date();
    user.kycData.approvedBy = req.user.userId; // Admin ID
    
    await user.save();
    
    res.json({
      message: 'KYC approved successfully',
      userId: user._id,
      kycStatus: user.kycStatus,
      approvedAt: user.kycData.approvedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve KYC', error: error.message });
  }
});

// Reject KYC
router.post('/reject/:userId', authenticate, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.kycStatus = 'rejected';
    user.kycData.rejectionReason = reason || 'Rejected by admin';
    
    await user.save();
    
    res.json({
      message: 'KYC rejected',
      userId: user._id,
      kycStatus: user.kycStatus,
      rejectionReason: user.kycData.rejectionReason
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject KYC', error: error.message });
  }
});

// Request resubmission
router.post('/request-resubmission/:userId', authenticate, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.kycStatus = 'not_started';
    user.kycData.resubmissionRequest = {
      reason: reason || 'Please resubmit your KYC documents',
      requestedAt: new Date(),
      requestedBy: req.user.userId
    };
    
    await user.save();
    
    res.json({
      message: 'Resubmission request sent to user',
      userId: user._id,
      kycStatus: user.kycStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to request resubmission', error: error.message });
  }
});

// Get KYC statistics
router.get('/statistics', authenticate, adminOnly, async (req, res) => {
  try {
    const stats = {
      notStarted: await User.countDocuments({ kycStatus: 'not_started' }),
      pending: await User.countDocuments({ kycStatus: 'pending' }),
      approved: await User.countDocuments({ kycStatus: 'approved' }),
      rejected: await User.countDocuments({ kycStatus: 'rejected' }),
      kycRequired: await User.countDocuments({ kycRequired: true }),
      kycRequiredButNotApproved: await User.countDocuments({ 
        kycRequired: true, 
        kycStatus: { $ne: 'approved' } 
      })
    };
    
    res.json({
      statistics: stats,
      total: stats.notStarted + stats.pending + stats.approved + stats.rejected
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch KYC statistics', error: error.message });
  }
});

export default router;
