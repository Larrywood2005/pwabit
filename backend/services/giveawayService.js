import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import balanceService from './balanceService.js';
import mongoose from 'mongoose';

/**
 * Giveaway Service - Handle USD and PowaUp transfers between users
 * CRITICAL: Uses atomic MongoDB transactions for safety
 */

/**
 * Send USD giveaway (requires OTP verification)
 * Flow: Find recipient → Verify OTP → Calculate availableBalance → Deduct sender balance → Add to receiver → Create transactions
 * CRITICAL FIX: Uses availableBalance (SINGLE SOURCE OF TRUTH) instead of currentBalance for validation
 */
export const sendUSDGiveaway = async (senderId, recipientUserCode, amount, otp) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    if (!senderId || !recipientUserCode || !amount || !otp) {
      throw new Error('[v0] Missing required fields: senderId, userCode, amount, otp');
    }
    
    if (amount <= 0) {
      throw new Error('[v0] Amount must be greater than zero');
    }
    
    // Find sender
    const sender = await User.findById(senderId).session(session);
    if (!sender) {
      throw new Error('[v0] Sender not found');
    }
    
    // CRITICAL: Verify OTP matches and hasn't expired
    if (!sender.withdrawalOTP || sender.withdrawalOTP !== otp) {
      throw new Error('[v0] Invalid OTP');
    }
    
    const now = new Date();
    if (!sender.withdrawalOTPExpire || sender.withdrawalOTPExpire < now) {
      throw new Error('[v0] OTP has expired');
    }
    
    // Find recipient by userCode
    const recipient = await User.findOne({ userCode: recipientUserCode }).session(session);
    if (!recipient) {
      throw new Error('[v0] Recipient not found');
    }
    
    // Prevent self-transfer
    if (sender._id.toString() === recipient._id.toString()) {
      throw new Error('[v0] Cannot send giveaway to yourself');
    }
    
    // ============================================
    // CRITICAL FIX: Use availableBalance instead of currentBalance
    // availableBalance = currentBalance - lockedInTrades - pendingWithdrawal
    // This is the SINGLE SOURCE OF TRUTH used by withdrawals and PowaUp
    // ============================================
    const balanceInfo = await balanceService.calculateAvailableBalance(senderId);
    const availableBalance = Math.max(0, balanceInfo.availableBalance);
    const senderCurrentBalance = sender.currentBalance || 0;
    
    // Add debug log showing balance calculation
    console.log('[BALANCE DEBUG - GIVEAWAY]', {
      senderId: senderId.toString(),
      senderEmail: sender.email,
      currentBalance: senderCurrentBalance,
      availableBalance: availableBalance,
      lockedInTrades: balanceInfo.lockedInTrades || 0,
      pendingWithdrawal: balanceInfo.pendingWithdrawal || 0,
      amount: amount,
      canSend: availableBalance >= amount,
      message: 'SINGLE SOURCE OF TRUTH: availableBalance = currentBalance - lockedInTrades - pendingWithdrawal'
    });
    
    // Validate using availableBalance (not currentBalance)
    if (availableBalance < amount) {
      throw new Error(`[v0] Insufficient available balance. You have $${availableBalance.toFixed(2)} but need $${amount.toFixed(2)}`);
    }
    
    // ATOMIC: Deduct from sender (using currentBalance), add to recipient
    // After validation passed, we deduct from currentBalance because validation confirms availableBalance is sufficient
    sender.currentBalance = Math.max(0, senderCurrentBalance - amount);
    await sender.save({ session });
    
    recipient.currentBalance = (recipient.currentBalance || 0) + amount;
    await recipient.save({ session });
    
    // Clear OTP after successful use
    sender.withdrawalOTP = null;
    sender.withdrawalOTPExpire = null;
    sender.withdrawalOTPVerified = false;
    await sender.save({ session });
    
    // Create sender transaction (giveaway_sent)
    const senderTx = new Transaction({
      userId: sender._id,
      type: 'giveaway_sent',
      amount: amount,
      currency: 'USD',
      status: 'completed',
      senderId: sender._id,
      receiverId: recipient._id,
      senderUserCode: sender.userCode,
      receiverUserCode: recipient.userCode,
      transferType: 'usd',
      description: `Sent $${amount} to ${recipient.fullName} (${recipientUserCode})`,
      details: {
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        timestamp: new Date()
      }
    });
    await senderTx.save({ session });
    
    // Create recipient transaction (giveaway_received)
    const recipientTx = new Transaction({
      userId: recipient._id,
      type: 'giveaway_received',
      amount: amount,
      currency: 'USD',
      status: 'completed',
      senderId: sender._id,
      receiverId: recipient._id,
      senderUserCode: sender.userCode,
      receiverUserCode: recipient.userCode,
      transferType: 'usd',
      description: `Received $${amount} from ${sender.fullName} (${sender.userCode})`,
      details: {
        senderName: sender.fullName,
        senderEmail: sender.email,
        timestamp: new Date()
      }
    });
    await recipientTx.save({ session });
    
    await session.commitTransaction();
    
    console.log('[v0] USD giveaway successful:', {
      sender: sender._id,
      recipient: recipient._id,
      amount,
      senderNewBalance: sender.currentBalance,
      recipientNewBalance: recipient.currentBalance,
      validatedWithAvailableBalance: availableBalance
    });
    
    return {
      success: true,
      message: `Successfully sent $${amount} to ${recipient.fullName}`,
      senderNewBalance: sender.currentBalance,
      recipientNewBalance: recipient.currentBalance,
      senderTransaction: senderTx._id,
      recipientTransaction: recipientTx._id
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('[v0] USD giveaway failed:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Send PowaUp giveaway (no OTP needed, just confirmation)
 * Flow: Find recipient → Validate balance → Deduct PowaUp → Add to recipient → Create transactions
 */
export const sendPowaUpGiveaway = async (senderId, recipientUserCode, amount) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    if (!senderId || !recipientUserCode || !amount) {
      throw new Error('[v0] Missing required fields: senderId, userCode, amount');
    }
    
    if (amount <= 0) {
      throw new Error('[v0] Amount must be greater than zero');
    }
    
    // Find sender
    const sender = await User.findById(senderId).session(session);
    if (!sender) {
      throw new Error('[v0] Sender not found');
    }
    
    // Find recipient by userCode
    const recipient = await User.findOne({ userCode: recipientUserCode }).session(session);
    if (!recipient) {
      throw new Error('[v0] Recipient not found');
    }
    
    // Prevent self-transfer
    if (sender._id.toString() === recipient._id.toString()) {
      throw new Error('[v0] Cannot send giveaway to yourself');
    }
    
    // Validate sender PowaUp balance
    const senderPowaUp = sender.powaUpBalance || 0;
    if (senderPowaUp < amount) {
      throw new Error(`[v0] Insufficient PowaUp balance. You have ${senderPowaUp} but need ${amount}`);
    }
    
    // ATOMIC: Deduct from sender, add to recipient
    sender.powaUpBalance = Math.max(0, senderPowaUp - amount);
    await sender.save({ session });
    
    recipient.powaUpBalance = (recipient.powaUpBalance || 0) + amount;
    await recipient.save({ session });
    
    // Create sender transaction (powaup_sent)
    const senderTx = new Transaction({
      userId: sender._id,
      type: 'powaup_sent',
      amount: amount,
      currency: 'PowaUp',
      status: 'completed',
      senderId: sender._id,
      receiverId: recipient._id,
      senderUserCode: sender.userCode,
      receiverUserCode: recipient.userCode,
      transferType: 'powaup',
      description: `Sent ${amount} PowaUp to ${recipient.fullName} (${recipientUserCode})`,
      details: {
        recipientName: recipient.fullName,
        recipientEmail: recipient.email,
        timestamp: new Date()
      }
    });
    await senderTx.save({ session });
    
    // Create recipient transaction (powaup_received)
    const recipientTx = new Transaction({
      userId: recipient._id,
      type: 'powaup_received',
      amount: amount,
      currency: 'PowaUp',
      status: 'completed',
      senderId: sender._id,
      receiverId: recipient._id,
      senderUserCode: sender.userCode,
      receiverUserCode: recipient.userCode,
      transferType: 'powaup',
      description: `Received ${amount} PowaUp from ${sender.fullName} (${sender.userCode})`,
      details: {
        senderName: sender.fullName,
        senderEmail: sender.email,
        timestamp: new Date()
      }
    });
    await recipientTx.save({ session });
    
    await session.commitTransaction();
    
    console.log('[v0] PowaUp giveaway successful:', {
      sender: sender._id,
      recipient: recipient._id,
      amount,
      senderNewBalance: sender.powaUpBalance,
      recipientNewBalance: recipient.powaUpBalance
    });
    
    return {
      success: true,
      message: `Successfully sent ${amount} PowaUp to ${recipient.fullName}`,
      senderNewBalance: sender.powaUpBalance,
      recipientNewBalance: recipient.powaUpBalance,
      senderTransaction: senderTx._id,
      recipientTransaction: recipientTx._id
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('[v0] PowaUp giveaway failed:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

export default {
  sendUSDGiveaway,
  sendPowaUpGiveaway
};
