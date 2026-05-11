import Signal from '../models/Signal.js';
import SignalSubscription from '../models/SignalSubscription.js';
import SignalTransaction from '../models/SignalTransaction.js';
import SignalPayment from '../models/SignalPayment.js';
import User from '../models/User.js';

/**
 * Signal Service - Manages trading signals and subscriptions
 */

// Create a new signal
const createSignal = async (signalData, providerId) => {
  try {
    const provider = await User.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const signal = new Signal({
      ...signalData,
      providerId: providerId,
      providerName: provider.fullName || provider.email,
      status: 'ACTIVE',
      isPublished: false
    });

    await signal.save();
    console.log('[SIGNAL] New signal created:', signal._id);
    return signal;
  } catch (error) {
    console.error('[SIGNAL] Error creating signal:', error.message);
    throw error;
  }
};

// Publish a signal
const publishSignal = async (signalId) => {
  try {
    const signal = await Signal.findByIdAndUpdate(
      signalId,
      { isPublished: true, publishedAt: new Date() },
      { new: true }
    );

    if (!signal) {
      throw new Error('Signal not found');
    }

    console.log('[SIGNAL] Signal published:', signalId);
    return signal;
  } catch (error) {
    console.error('[SIGNAL] Error publishing signal:', error.message);
    throw error;
  }
};

// Get all active signals for a provider
const getProviderSignals = async (providerId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    const signals = await Signal.find({ providerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments({ providerId });

    return {
      signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[SIGNAL] Error fetching provider signals:', error.message);
    throw error;
  }
};

// Get published signals for users
const getPublishedSignals = async (tradingPair = null, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    const query = { isPublished: true, status: 'ACTIVE' };

    if (tradingPair) {
      query.tradingPair = tradingPair;
    }

    const signals = await Signal.find(query)
      .populate('providerId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments(query);

    return {
      signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('[SIGNAL] Error fetching published signals:', error.message);
    throw error;
  }
};

// Subscribe to a provider's signals
const subscribeToProvider = async (userId, providerId, subscriptionType, price) => {
  const session = await SignalSubscription.startSession();
  session.startTransaction();

  try {
    // Check if already subscribed
    const existing = await SignalSubscription.findOne({
      userId,
      providerId,
      status: { $in: ['ACTIVE', 'PAUSED'] }
    });

    if (existing) {
      await session.abortTransaction();
      throw new Error('Already subscribed to this provider');
    }

    // Create subscription
    const nextRenewalDate = new Date();
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);

    const subscription = new SignalSubscription({
      userId,
      providerId,
      subscriptionType,
      monthlyPrice: price,
      nextRenewalDate,
      status: 'ACTIVE'
    });

    await subscription.save({ session });

    // Create transaction record
    const transaction = new SignalTransaction({
      signalId: null,
      subscriptionId: subscription._id,
      userId,
      providerId,
      type: 'SIGNAL_SUBSCRIPTION',
      amount: price,
      paymentMethod: 'BALANCE',
      status: 'PENDING',
      providerRevenue: price * 0.8, // 80% to provider
      platformFee: price * 0.2 // 20% platform fee
    });

    await transaction.save({ session });

    await session.commitTransaction();
    console.log('[SIGNAL] New subscription created:', subscription._id);

    return {
      subscription,
      transaction
    };
  } catch (error) {
    await session.abortTransaction();
    console.error('[SIGNAL] Error creating subscription:', error.message);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Process payment for subscription
const processSubscriptionPayment = async (transactionId, paymentMethod) => {
  const session = await SignalTransaction.startSession();
  session.startTransaction();

  try {
    const transaction = await SignalTransaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Transaction already processed');
    }

    if (paymentMethod === 'BALANCE') {
      // Deduct from user balance
      const user = await User.findById(transaction.userId);
      if (!user || user.currentBalance < transaction.amount) {
        throw new Error('Insufficient balance');
      }

      user.currentBalance -= transaction.amount;
      await user.save({ session });

      // Update provider balance (add revenue)
      const provider = await User.findById(transaction.providerId);
      if (provider) {
        provider.currentBalance += transaction.providerRevenue;
        await provider.save({ session });
      }

      // Mark transaction as completed
      transaction.status = 'COMPLETED';
      transaction.completedAt = new Date();
      await transaction.save({ session });

      // Update subscription
      const subscription = await SignalSubscription.findById(transaction.subscriptionId);
      if (subscription) {
        subscription.lastPaymentDate = new Date();
        subscription.status = 'ACTIVE';
        await subscription.save({ session });
      }
    }

    await session.commitTransaction();
    console.log('[SIGNAL] Payment processed:', transactionId);

    return transaction;
  } catch (error) {
    await session.abortTransaction();
    console.error('[SIGNAL] Error processing payment:', error.message);
    throw error;
  } finally {
    await session.endSession();
  }
};

// Record signal result
const recordSignalResult = async (signalId, resultPrice, resultStatus) => {
  try {
    const signal = await Signal.findByIdAndUpdate(
      signalId,
      {
        resultPrice,
        resultStatus,
        status: 'CLOSED',
        closedAt: new Date()
      },
      { new: true }
    );

    if (!signal) {
      throw new Error('Signal not found');
    }

    // Update subscriber win/loss stats
    const subscriptions = await SignalSubscription.find({
      providerId: signal.providerId,
      status: 'ACTIVE'
    });

    for (const subscription of subscriptions) {
      subscription.totalSignalsReceived += 1;
      if (resultStatus === 'WIN') {
        subscription.totalWins += 1;
      } else if (resultStatus === 'LOSS') {
        subscription.totalLosses += 1;
      }
      subscription.winRatePercentage = (subscription.totalWins / subscription.totalSignalsReceived) * 100;
      await subscription.save();
    }

    // Update signal provider's win rate
    const signals = await Signal.find({ providerId: signal.providerId, resultStatus: { $ne: null } });
    const wins = signals.filter(s => s.resultStatus === 'WIN').length;
    signal.winRatePercentage = (wins / signals.length) * 100;
    await signal.save();

    console.log('[SIGNAL] Signal result recorded:', signalId);
    return signal;
  } catch (error) {
    console.error('[SIGNAL] Error recording signal result:', error.message);
    throw error;
  }
};

// Get provider stats
const getProviderStats = async (providerId) => {
  try {
    const signals = await Signal.find({ providerId, resultStatus: { $ne: null } });
    const wins = signals.filter(s => s.resultStatus === 'WIN').length;
    const total = signals.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    const subscribers = await SignalSubscription.countDocuments({
      providerId,
      status: 'ACTIVE'
    });

    const totalRevenue = await SignalTransaction.aggregate([
      { $match: { providerId, status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$providerRevenue' } } }
    ]);

    return {
      totalSignals: signals.length,
      totalWins: wins,
      totalLosses: total - wins,
      winRatePercentage: winRate,
      activeSubscribers: subscribers,
      totalRevenue: totalRevenue[0]?.total || 0
    };
  } catch (error) {
    console.error('[SIGNAL] Error getting provider stats:', error.message);
    throw error;
  }
};

export default {
  createSignal,
  publishSignal,
  getProviderSignals,
  getPublishedSignals,
  subscribeToProvider,
  processSubscriptionPayment,
  recordSignalResult,
  getProviderStats
};
