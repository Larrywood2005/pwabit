import express from 'express';
import { authenticate } from '../middleware/auth.js';
import KYC from '../models/KYC.js';
import User from '../models/User.js';

const router = express.Router();

// Submit KYC
router.post('/submit', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const { fullName, dateOfBirth, identityPhoto } = req.body;

    if (!fullName || !dateOfBirth || !identityPhoto) {
      return res.status(400).json({ message: 'All KYC fields are required' });
    }

    // Check if KYC already exists
    let kyc = await KYC.findOne({ userId });
    const user = await User.findById(userId);

    // Check if already approved
    if (kyc && kyc.status === 'approved') {
      return res.status(400).json({ message: 'KYC already approved' });
    }

    if (kyc) {
      // Update existing KYC (re-submission after rejection)
      kyc.fullName = fullName;
      kyc.dateOfBirth = dateOfBirth;
      kyc.identityPhoto = identityPhoto;
      kyc.status = 'pending';
      kyc.submittedAt = Date.now();
      kyc.rejectionReason = null; // Clear previous rejection
      await kyc.save();
    } else {
      // Create new KYC
      kyc = new KYC({
        userId,
        fullName,
        dateOfBirth,
        identityPhoto,
        status: 'pending'
      });
      await kyc.save();
    }

    // Sync with User model
    if (user) {
      user.kycStatus = 'pending';
      user.kycDocuments = user.kycDocuments || {};
      user.kycDocuments.submittedAt = new Date();
      user.kycDocuments.status = 'pending';
      await user.save();
    }

    console.log('[v0] KYC submitted for user:', userId);

    res.json({
      message: 'KYC submitted successfully. Admin will review your documents.',
      kyc: {
        id: kyc._id,
        status: kyc.status,
        submittedAt: kyc.submittedAt
      }
    });
  } catch (error) {
    console.error('[v0] KYC submit error:', error);
    res.status(500).json({ message: 'Failed to submit KYC' });
  }
});

// Get KYC status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const kyc = await KYC.findOne({ userId });
    
    // Also check user's kycStatus field
    const user = await User.findById(userId);

    if (!kyc && (!user || user.kycStatus === 'not_started')) {
      return res.json({
        message: 'KYC not submitted',
        status: 'not-submitted',
        canUpdate: true,
        kyc: null
      });
    }

    // Determine if user can update KYC (rejected or not started)
    const canUpdate = !kyc || kyc.status === 'rejected' || (user && user.kycStatus === 'rejected');

    res.json({
      message: 'KYC status',
      status: kyc?.status || user?.kycStatus || 'not-submitted',
      canUpdate,
      kyc: kyc ? {
        id: kyc._id,
        fullName: kyc.fullName,
        dateOfBirth: kyc.dateOfBirth,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        approvedAt: kyc.approvedAt,
        rejectionReason: kyc.rejectionReason
      } : null
    });
  } catch (error) {
    console.error('[v0] KYC status error:', error);
    res.status(500).json({ message: 'Failed to fetch KYC status' });
  }
});

// Update KYC (for rejected or re-submission)
router.put('/update', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const { fullName, dateOfBirth, identityPhoto } = req.body;

    if (!fullName || !dateOfBirth || !identityPhoto) {
      return res.status(400).json({ message: 'All KYC fields are required' });
    }

    // Find existing KYC
    let kyc = await KYC.findOne({ userId });
    const user = await User.findById(userId);

    // Check if user can update KYC
    if (kyc && kyc.status === 'approved') {
      return res.status(400).json({ message: 'KYC already approved. Cannot modify.' });
    }

    if (kyc) {
      // Update existing KYC
      kyc.fullName = fullName;
      kyc.dateOfBirth = dateOfBirth;
      kyc.identityPhoto = identityPhoto;
      kyc.status = 'pending';
      kyc.submittedAt = Date.now();
      kyc.rejectionReason = null; // Clear previous rejection
      await kyc.save();
    } else {
      // Create new KYC
      kyc = new KYC({
        userId,
        fullName,
        dateOfBirth,
        identityPhoto,
        status: 'pending'
      });
      await kyc.save();
    }

    // Update user's KYC status
    if (user) {
      user.kycStatus = 'pending';
      user.kycDocuments = user.kycDocuments || {};
      user.kycDocuments.submittedAt = new Date();
      user.kycDocuments.status = 'pending';
      await user.save();
    }

    console.log('[v0] KYC updated/resubmitted for user:', userId);

    res.json({
      message: 'KYC updated successfully. Admin will review your documents.',
      kyc: {
        id: kyc._id,
        status: kyc.status,
        submittedAt: kyc.submittedAt
      }
    });
  } catch (error) {
    console.error('[v0] KYC update error:', error);
    res.status(500).json({ message: 'Failed to update KYC' });
  }
});

// Admin: Get all pending KYC submissions
router.get('/admin/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const kycRecords = await KYC.find({ status: 'pending' })
      .populate('userId', 'email phone balance fullName')
      .sort({ submittedAt: -1 });

    console.log('[v0] Admin fetched pending KYC - Count:', kycRecords.length);

    res.json({
      message: 'Pending KYC records',
      total: kycRecords.length,
      data: kycRecords
    });
  } catch (error) {
    console.error('[v0] Admin KYC fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch KYC records' });
  }
});

// Admin: Get ALL KYC submissions (for audit trail - pending, approved, rejected)
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const kycRecords = await KYC.find()
      .populate('userId', 'email phone balance fullName kycStatus')
      .sort({ submittedAt: -1 });

    console.log('[v0] Admin fetched ALL KYC records (audit trail) - Count:', kycRecords.length);

    res.json({
      message: 'All KYC records',
      total: kycRecords.length,
      data: kycRecords
    });
  } catch (error) {
    console.error('[v0] Admin fetch all KYC error:', error);
    res.status(500).json({ message: 'Failed to fetch all KYC records' });
  }
});

// Admin: Approve KYC
router.put('/admin/approve/:kycId', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId || req.user._id;
    
    // Check admin permission (role from token or type)
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized - Admin access required' });
    }

    const kyc = await KYC.findByIdAndUpdate(
      req.params.kycId,
      {
        status: 'approved',
        approvedAt: Date.now(),
        verifiedBy: adminId
      },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    // Sync with User model - CRITICAL for withdrawal eligibility
    let user;
    try {
      user = await User.findById(kyc.userId);
      if (user) {
        user.kycStatus = 'verified';
        user.kycDocuments = user.kycDocuments || {};
        user.kycDocuments.verifiedAt = new Date();
        user.kycDocuments.verifiedBy = adminId;
        user.kycDocuments.status = 'verified';
        await user.save();
        console.log('[v0] KYC APPROVED - User can now withdraw:', user._id);
      }
    } catch (userSyncError) {
      console.error('[v0] KYC approval - Error syncing user status:', {
        kycId: req.params.kycId,
        error: userSyncError.message
      });
      // Continue even if user sync fails - KYC is already approved
    }

    res.json({
      message: 'KYC approved successfully - User can now withdraw',
      kyc,
      user: user ? { _id: user._id, kycStatus: user.kycStatus } : null
    });
  } catch (error) {
    console.error('[v0] Admin KYC approve error:', {
      error: error.message,
      stack: error.stack,
      kycId: req.params.kycId
    });
    res.status(500).json({ message: 'Failed to approve KYC' });
  }
});

// Admin: Reject KYC
router.put('/admin/reject/:kycId', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId || req.user._id;
    
    // Check admin permission
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.type !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized - Admin access required' });
    }

    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const kyc = await KYC.findByIdAndUpdate(
      req.params.kycId,
      {
        status: 'rejected',
        rejectionReason,
        verifiedBy: adminId
      },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    // Sync with User model - user can resubmit
    let user;
    try {
      user = await User.findById(kyc.userId);
      if (user) {
        user.kycStatus = 'rejected';
        user.kycDocuments = user.kycDocuments || {};
        user.kycDocuments.rejectedAt = new Date();
        user.kycDocuments.rejectedBy = adminId;
        user.kycDocuments.status = 'rejected';
        user.kycDocuments.rejectionReason = rejectionReason;
        await user.save();
        console.log('[v0] KYC REJECTED - User can resubmit:', user._id);
      }
    } catch (userSyncError) {
      console.error('[v0] KYC rejection - Error syncing user status:', {
        kycId: req.params.kycId,
        error: userSyncError.message
      });
      // Continue even if user sync fails - KYC is already rejected
    }

    res.json({
      message: 'KYC rejected - User can resubmit with corrected documents',
      kyc,
      user: user ? { _id: user._id, kycStatus: user.kycStatus } : null
    });
  } catch (error) {
    console.error('[v0] Admin KYC reject error:', {
      error: error.message,
      stack: error.stack,
      kycId: req.params.kycId
    });
    res.status(500).json({ message: 'Failed to reject KYC' });
  }
});

export default router;
