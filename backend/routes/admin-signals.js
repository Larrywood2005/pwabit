import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import signalService from '../services/signalService.js';
import Signal from '../models/Signal.js';
import SignalSubscription from '../models/SignalSubscription.js';
import SignalTransaction from '../models/SignalTransaction.js';

const router = express.Router();

let socketIO;

export const setSocketIO = (io) => {
  socketIO = io;
  router.io = io;
};

// Provider Routes (for signal providers)

// Create a new signal
router.post('/create', authenticate, async (req, res) => {
  try {
    const { title, description, tradingPair, direction, entryPrice, targetPrice, stopLossPrice, timeframe, validUntil } = req.body;

    if (!title || !tradingPair || !direction || entryPrice === undefined || targetPrice === undefined || stopLossPrice === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate risk/reward ratio
    const riskRewardRatio = (targetPrice - entryPrice) / (entryPrice - stopLossPrice);

    const signal = await signalService.createSignal({
      title,
      description,
      tradingPair,
      direction,
      entryPrice,
      targetPrice,
      stopLossPrice,
      riskRewardRatio,
      timeframe,
      validUntil
    }, req.user._id);

    // Broadcast to connected users
    if (router.io) {
      router.io.emit('signal-created', {
        signalId: signal._id,
        providerId: signal.providerId,
        tradingPair: signal.tradingPair,
        message: `New signal available for ${tradingPair}`
      });
    }

    res.json({
      message: 'Signal created successfully',
      signal
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error creating signal:', error);
    res.status(500).json({ message: 'Failed to create signal', error: error.message });
  }
});

// Get provider's signals
router.get('/my-signals', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const result = await signalService.getProviderSignals(req.user._id, page, limit);
    
    res.json({
      signals: result.signals,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error fetching signals:', error);
    res.status(500).json({ message: 'Failed to fetch signals', error: error.message });
  }
});

// Publish a signal
router.post('/:signalId/publish', authenticate, async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    if (signal.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const published = await signalService.publishSignal(signal._id);

    // Broadcast to subscribers
    const subscriptions = await SignalSubscription.find({
      providerId: req.user._id,
      status: 'ACTIVE'
    });

    const subscriberIds = subscriptions.map(sub => `user_${sub.userId.toString()}`);

    if (router.io && subscriberIds.length > 0) {
      subscriberIds.forEach(roomId => {
        router.io.to(roomId).emit('new-signal', {
          signalId: published._id,
          title: published.title,
          tradingPair: published.tradingPair,
          direction: published.direction,
          entryPrice: published.entryPrice,
          targetPrice: published.targetPrice,
          providerName: published.providerName
        });
      });
    }

    res.json({
      message: 'Signal published successfully',
      signal: published
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error publishing signal:', error);
    res.status(500).json({ message: 'Failed to publish signal', error: error.message });
  }
});

// Record signal result
router.post('/:signalId/result', authenticate, async (req, res) => {
  try {
    const { resultPrice, resultStatus } = req.body;

    if (!resultPrice || !resultStatus) {
      return res.status(400).json({ message: 'Result price and status required' });
    }

    const signal = await Signal.findById(req.params.signalId);

    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    if (signal.providerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updated = await signalService.recordSignalResult(signal._id, resultPrice, resultStatus);

    // Notify subscribers about result
    const subscriptions = await SignalSubscription.find({
      providerId: req.user._id,
      status: 'ACTIVE'
    });

    const subscriberIds = subscriptions.map(sub => `user_${sub.userId.toString()}`);

    if (router.io && subscriberIds.length > 0) {
      subscriberIds.forEach(roomId => {
        router.io.to(roomId).emit('signal-result', {
          signalId: signal._id,
          resultStatus,
          resultPrice,
          message: `Signal result: ${resultStatus}`
        });
      });
    }

    res.json({
      message: 'Signal result recorded',
      signal: updated
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error recording result:', error);
    res.status(500).json({ message: 'Failed to record result', error: error.message });
  }
});

// Get provider stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await signalService.getProviderStats(req.user._id);
    
    res.json(stats);
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Admin Routes (for super_admin/admin)

// Get all signals across all providers
router.get('/admin/all-signals', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const signals = await Signal.find(query)
      .populate('providerId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments(query);

    res.json({
      signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error fetching all signals:', error);
    res.status(500).json({ message: 'Failed to fetch signals', error: error.message });
  }
});

// Revenue analytics dashboard
router.get('/admin/analytics', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    // Total platform revenue
    const totalRevenue = await SignalTransaction.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);

    // Provider revenue
    const providerRevenue = await SignalTransaction.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: '$providerId', revenue: { $sum: '$providerRevenue' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } },
      { $unwind: '$provider' },
      { $sort: { revenue: -1 } }
    ]);

    // Total subscriptions
    const totalSubscriptions = await SignalSubscription.countDocuments({ status: 'ACTIVE' });

    // Subscription breakdown by type
    const subscriptionBreakdown = await SignalSubscription.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$subscriptionType', count: { $sum: 1 } } }
    ]);

    // Top performers
    const topProviders = await Signal.aggregate([
      { $match: { resultStatus: { $ne: null } } },
      { $group: {
          _id: '$providerId',
          totalSignals: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$resultStatus', 'WIN'] }, 1, 0] } }
        }
      },
      { $project: {
          _id: 1,
          totalSignals: 1,
          wins: 1,
          winRate: { $multiply: [{ $divide: ['$wins', '$totalSignals'] }, 100] }
        }
      },
      { $sort: { wins: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } }
    ]);

    res.json({
      totalPlatformRevenue: totalRevenue[0]?.total || 0,
      topProviders: providerRevenue.slice(0, 10),
      totalActiveSubscriptions: totalSubscriptions,
      subscriptionBreakdown,
      topPerformers: topProviders
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error fetching analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Payout management
router.post('/admin/payout/:providerId', authenticate, authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { providerId } = req.params;

    // Get unpaid revenue
    const revenue = await SignalTransaction.aggregate([
      { $match: { providerId: require('mongoose').Types.ObjectId(providerId), status: 'COMPLETED', paid: false } },
      { $group: { _id: null, total: { $sum: '$providerRevenue' } } }
    ]);

    if (!revenue[0]) {
      return res.status(400).json({ message: 'No unpaid revenue' });
    }

    // Mark as paid
    await SignalTransaction.updateMany(
      { providerId, status: 'COMPLETED', paid: false },
      { paid: true, paidAt: new Date() }
    );

    res.json({
      message: 'Payout processed',
      amount: revenue[0].total,
      providerId
    });
  } catch (error) {
    console.error('[ADMIN-SIGNALS] Error processing payout:', error);
    res.status(500).json({ message: 'Failed to process payout', error: error.message });
  }
});

export default router;
