import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendUSDGiveaway, sendPowaUpGiveaway } from '../services/giveawayService.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /giveaway/send
 * Send USD or PowaUp to a user by their 6-digit userCode
 * 
 * Body:
 * {
 *   "userCode": "123456",
 *   "amount": 10,
 *   "type": "usd" | "powaup",
 *   "otp": "123456" (only required for USD)
 * }
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userCode, amount, type, otp } = req.body;
    const senderId = req.user._id;
    
    console.log('[v0] Giveaway request:', { senderId, userCode, amount, type });
    
    // Validation
    if (!userCode || !amount || !type) {
      return res.status(400).json({ 
        message: 'Missing required fields: userCode, amount, type'
      });
    }
    
    if (!['usd', 'powaup'].includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid type. Must be "usd" or "powaup"'
      });
    }
    
    if (type === 'usd' && !otp) {
      return res.status(400).json({ 
        message: 'OTP is required for USD transfers'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be greater than zero'
      });
    }
    
    let result;
    
    if (type === 'usd') {
      result = await sendUSDGiveaway(senderId, userCode, amount, otp);
    } else {
      result = await sendPowaUpGiveaway(senderId, userCode, amount);
    }
    
    // Emit Socket.io events for real-time updates
    if (req.io) {
      // Emit to sender
      req.io.to(senderId.toString()).emit('giveaway-sent', {
        type: type,
        amount: amount,
        recipientCode: userCode,
        newBalance: result[type === 'usd' ? 'senderNewBalance' : 'senderNewBalance']
      });
      
      // Emit to recipient
      const recipient = await User.findOne({ userCode });
      if (recipient) {
        req.io.to(recipient._id.toString()).emit('giveaway-received', {
          type: type,
          amount: amount,
          senderCode: (await User.findById(senderId)).userCode,
          newBalance: result[type === 'usd' ? 'recipientNewBalance' : 'recipientNewBalance']
        });
      }
    }
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[v0] Giveaway error:', error.message);
    res.status(400).json({ 
      message: error.message || 'Giveaway failed',
      error: error.message
    });
  }
});

/**
 * GET /giveaway/history
 * Get giveaway transaction history
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'all', limit = 20, page = 0 } = req.query;
    
    const Transaction = require('../models/Transaction.js').default;
    
    let query = {
      $or: [
        { userId: userId, type: { $in: ['giveaway_sent', 'powaup_sent'] } },
        { userId: userId, type: { $in: ['giveaway_received', 'powaup_received'] } }
      ]
    };
    
    if (type !== 'all') {
      if (type === 'sent') {
        query = { userId: userId, type: { $in: ['giveaway_sent', 'powaup_sent'] } };
      } else if (type === 'received') {
        query = { userId: userId, type: { $in: ['giveaway_received', 'powaup_received'] } };
      }
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[v0] Get giveaway history error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch giveaway history',
      error: error.message
    });
  }
});

/**
 * GET /giveaway/validate-recipient/:userCode
 * Validate if a recipient userCode exists
 */
router.get('/validate-recipient/:userCode', authenticate, async (req, res) => {
  try {
    const { userCode } = req.params;
    
    if (!userCode) {
      return res.status(400).json({ valid: false, message: 'UserCode required' });
    }
    
    const recipient = await User.findOne({ userCode }).select('_id fullName userCode');
    
    if (!recipient) {
      return res.json({ valid: false, message: 'User not found' });
    }
    
    // Prevent self-transfer validation
    if (recipient._id.toString() === req.user._id.toString()) {
      return res.json({ valid: false, message: 'Cannot send to yourself' });
    }
    
    res.json({
      valid: true,
      recipient: {
        userCode: recipient.userCode,
        fullName: recipient.fullName
      }
    });
    
  } catch (error) {
    console.error('[v0] Validate recipient error:', error);
    res.status(500).json({ 
      valid: false,
      message: 'Validation failed'
    });
  }
});

export default router;
