import express from 'express';
import { authenticate } from '../middleware/auth.js';
import KYC from '../models/KYC.js';
import User from '../models/User.js';

const router = express.Router();

// Submit KYC
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { fullName, dateOfBirth, identityPhoto } = req.body;

    if (!fullName || !dateOfBirth || !identityPhoto) {
      return res.status(400).json({ message: 'All KYC fields are required' });
    }

    // Check if KYC already exists
    let kyc = await KYC.findOne({ userId: req.user.id });

    if (kyc) {
      // Update existing KYC
      kyc.fullName = fullName;
      kyc.dateOfBirth = dateOfBirth;
      kyc.identityPhoto = identityPhoto;
      kyc.status = 'pending';
      kyc.submittedAt = Date.now();
      await kyc.save();
    } else {
      // Create new KYC
      kyc = new KYC({
        userId: req.user.id,
        fullName,
        dateOfBirth,
        identityPhoto
      });
      await kyc.save();
    }

    res.json({
      message: 'KYC submitted successfully',
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
    const kyc = await KYC.findOne({ userId: req.user.id });

    if (!kyc) {
      return res.json({
        message: 'KYC not submitted',
        status: 'not-submitted',
        kyc: null
      });
    }

    res.json({
      message: 'KYC status',
      status: kyc.status,
      kyc: {
        id: kyc._id,
        fullName: kyc.fullName,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        approvedAt: kyc.approvedAt,
        rejectionReason: kyc.rejectionReason
      }
    });
  } catch (error) {
    console.error('[v0] KYC status error:', error);
    res.status(500).json({ message: 'Failed to fetch KYC status' });
  }
});

// Admin: Get all pending KYC submissions
router.get('/admin/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const kycRecords = await KYC.find({ status: 'pending' })
      .populate('userId', 'email phone balance')
      .sort({ submittedAt: -1 });

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

// Admin: Approve KYC
router.put('/admin/approve/:kycId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const kyc = await KYC.findByIdAndUpdate(
      req.params.kycId,
      {
        status: 'approved',
        approvedAt: Date.now(),
        verifiedBy: req.user.id
      },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    res.json({
      message: 'KYC approved successfully',
      kyc
    });
  } catch (error) {
    console.error('[v0] Admin KYC approve error:', error);
    res.status(500).json({ message: 'Failed to approve KYC' });
  }
});

// Admin: Reject KYC
router.put('/admin/reject/:kycId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
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
        verifiedBy: req.user.id
      },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    res.json({
      message: 'KYC rejected successfully',
      kyc
    });
  } catch (error) {
    console.error('[v0] Admin KYC reject error:', error);
    res.status(500).json({ message: 'Failed to reject KYC' });
  }
});

export default router;
