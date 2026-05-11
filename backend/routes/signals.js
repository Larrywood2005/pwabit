import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import signalService from '../services/signalService.js';
import Signal from '../models/Signal.js';
import SignalSubscription from '../models/SignalSubscription.js';
import SignalTransaction from '../models/SignalTransaction.js';
import SignalPayment from '../models/SignalPayment.js';
import User from '../models/User.js';

const router = express.Router();

let socketIO;

export const setSocketIO = (io) => {
  socketIO = io;
  router.io = io;
};

// Get all published signals
router.get('/published', authenticate, async (req, res) => {
  try {
    const { tradingPair, page = 1, limit = 20 } = req.query;
    
    const result = await signalService.getPublishedSignals(tradingPair, page, limit);
    
    res.json({
      signals: result.signals,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[SIGNALS] Error fetching published signals:', error);
    res.status(500).json({ message: 'Failed to fetch signals', error: error.message });
  }
});

// Get signal detail
router.get('/:signalId', authenticate, async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.signalId)
      .populate('providerId', 'fullName email avatar');
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    // Check if user is subscribed
    const subscription = await SignalSubscription.findOne({
      userId: req.user._id,
      providerId: signal.providerId._id,
      status: 'ACTIVE'
    });

    res.json({
      signal,
      isSubscribed: !!subscription
    });
  } catch (error) {
    console.error('[SIGNALS] Error fetching signal:', error);
    res.status(500).json({ message: 'Failed to fetch signal', error: error.message });
  }
});

// Get provider's signals for subscription
router.get('/provider/:providerId/signals', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const result = await signalService.getProviderSignals(req.params.providerId, page, limit);
    
    res.json({
      signals: result.signals,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[SIGNALS] Error fetching provider signals:', error);
    res.status(500).json({ message: 'Failed to fetch signals', error: error.message });
  }
});

// Get provider stats
router.get('/provider/:providerId/stats', authenticate, async (req, res) => {
  try {
    const stats = await signalService.getProviderStats(req.params.providerId);
    
    res.json(stats);
  } catch (error) {
    console.error('[SIGNALS] Error fetching provider stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Subscribe to provider
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { providerId, subscriptionType, paymentMethod } = req.body;

    if (!providerId || !subscriptionType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Define subscription pricing
    const pricing = {
      PREMIUM: 19.99,
      VIP: 49.99,
      ELITE: 99.99
    };

    const price = pricing[subscriptionType] || pricing.PREMIUM;

    // Create subscription
    const { subscription, transaction } = await signalService.subscribeToProvider(
      req.user._id,
      providerId,
      subscriptionType,
      price
    );

    // If payment method is BALANCE, process immediately
    if (paymentMethod === 'BALANCE') {
      try {
        const user = await User.findById(req.user._id);
        if (!user || user.currentBalance < price) {
          // Cancel subscription
          subscription.status = 'CANCELLED';
          await subscription.save();
          
          return res.status(400).json({ 
            message: 'Insufficient balance',
            requiredBalance: price,
            currentBalance: user?.currentBalance || 0
          });
        }

        // Process payment
        await signalService.processSubscriptionPayment(transaction._id, 'BALANCE');
        
        // Broadcast to user and provider via socket
        if (router.io) {
          router.io.to(`user_${req.user._id.toString()}`).emit('subscription-activated', {
            subscriptionId: subscription._id,
            providerId,
            subscriptionType,
            status: 'ACTIVE'
          });

          router.io.to(`user_${providerId.toString()}`).emit('new-subscriber', {
            subscriberId: req.user._id,
            subscriberName: req.user.fullName,
            subscriptionType
          });
        }
      } catch (paymentError) {
        console.error('[SIGNALS] Payment processing error:', paymentError);
        return res.status(400).json({ message: paymentError.message });
      }
    } else if (paymentMethod === 'FRESH_USDT') {
      // Create payment record for wallet verification
      const payment = new SignalPayment({
        signalTransactionId: transaction._id,
        userId: req.user._id,
        providerId,
        amount: price,
        currency: 'USDT',
        fromAddress: req.body.fromAddress,
        toAddress: process.env.SIGNAL_WALLET_ADDRESS || '0x0000...'
      });

      await payment.save();

      return res.json({
        message: 'Subscription pending wallet payment',
        subscription,
        payment: {
          paymentId: payment._id,
          amount: price,
          currency: 'USDT',
          toAddress: payment.toAddress,
          expiresAt: payment.expiresAt,
          status: 'PENDING'
        }
      });
    }

    res.json({
      message: 'Subscription activated',
      subscription,
      transaction
    });
  } catch (error) {
    console.error('[SIGNALS] Error subscribing:', error);
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
});

// Get user's subscriptions
router.get('/my/subscriptions', authenticate, async (req, res) => {
  try {
    const subscriptions = await SignalSubscription.find({
      userId: req.user._id,
      status: { $in: ['ACTIVE', 'PAUSED'] }
    })
      .populate('providerId', 'fullName email avatar')
      .sort({ createdAt: -1 });

    // Get provider stats for each subscription
    const withStats = await Promise.all(
      subscriptions.map(async (sub) => {
        const stats = await signalService.getProviderStats(sub.providerId._id);
        return {
          ...sub.toObject(),
          providerStats: stats
        };
      })
    );

    res.json(withStats);
  } catch (error) {
    console.error('[SIGNALS] Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
  }
});

// Cancel subscription
router.post('/:subscriptionId/cancel', authenticate, async (req, res) => {
  try {
    const subscription = await SignalSubscription.findById(req.params.subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (subscription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = req.body.reason || 'User requested';
    
    await subscription.save();

    // Notify provider
    if (router.io) {
      router.io.to(`user_${subscription.providerId.toString()}`).emit('subscriber-cancelled', {
        subscriberId: req.user._id,
        subscriptionId: subscription._id
      });
    }

    res.json({
      message: 'Subscription cancelled',
      subscription
    });
  } catch (error) {
    console.error('[SIGNALS] Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
  }
});

// Verify USDT wallet payment
router.post('/payment/:paymentId/verify', authenticate, async (req, res) => {
  try {
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ message: 'Transaction hash required' });
    }

    const payment = await SignalPayment.findById(req.params.paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update payment with hash
    payment.txHash = txHash;
    payment.paymentStatus = 'CONFIRMING';
    await payment.save();

    // In production, would verify on blockchain
    // For now, mark as confirmed after brief check
    setTimeout(async () => {
      const updated = await SignalPayment.findByIdAndUpdate(
        req.params.paymentId,
        { 
          paymentStatus: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmations: 6
        },
        { new: true }
      );

      if (updated) {
        // Update subscription and transaction
        const transaction = await SignalTransaction.findById(updated.signalTransactionId);
        if (transaction) {
          transaction.status = 'COMPLETED';
          transaction.completedAt = new Date();
          await transaction.save();

          const subscription = await SignalSubscription.findById(transaction.subscriptionId);
          if (subscription) {
            subscription.status = 'ACTIVE';
            subscription.lastPaymentDate = new Date();
            await subscription.save();
          }
        }

        // Notify user
        if (router.io) {
          router.io.to(`user_${payment.userId.toString()}`).emit('payment-confirmed', {
            paymentId: payment._id,
            subscriptionId: transaction?.subscriptionId
          });
        }
      }
    }, 5000); // Simulate 5 second confirmation

    res.json({
      message: 'Payment verification initiated',
      payment,
      status: 'CONFIRMING'
    });
  } catch (error) {
    console.error('[SIGNALS] Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
});

export default router;
