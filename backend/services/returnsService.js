import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import transactionLogger from './transactionLogger.js';

// Global flag to prevent multiple scheduler instances
let schedulerInitialized = false;

/**
 * CRITICAL FIX: Process daily returns with atomic locking and strict 24h validation
 * Uses UTC consistently to prevent timezone-related duplicate payouts
 * Implements hard lock to prevent parallel execution
 */
export const calculateDailyReturns = async () => {
  try {
    const startTime = Date.now();
    console.log(`[ReturnsService] ✓ DAILY RETURNS CALCULATION STARTED at ${new Date().toISOString()}`);

    // Find all active investments
    const activeInvestments = await Investment.find({ 
      status: 'active'
    });
    
    console.log(`[ReturnsService] Found ${activeInvestments.length} active investments for processing`);
    
    for (const investment of activeInvestments) {
      try {
        const now = new Date();
        
        console.log(`\n[ROI CHECK] ========================================`);
        console.log(`[ROI CHECK] Investment ID: ${investment._id}`);
        console.log(`[ROI CHECK] Status: ${investment.status}`);
        console.log(`[ROI CHECK] Amount: $${investment.amount}`);
        console.log(`[ROI CHECK] Daily Return %: ${investment.dailyReturnPercent}%`);

        // ============================================
        // STRICT DAILY TRADE COMPLETION CHECK
        // ============================================
        // CRITICAL: ROI should ONLY be credited AFTER a full 24h cycle completes
        // NOT during the active trade window
        
        let cycleCompleted = false;
        let reason = '';
        
        if (!investment.lastReturnDate) {
          // FIRST CYCLE: Check if 24h have passed since activation
          const activatedAt = investment.activatedAt ? new Date(investment.activatedAt) : null;
          
          if (!activatedAt) {
            reason = 'No activatedAt timestamp - cannot process ROI';
            console.log(`[ROI CHECK] ✗ SKIPPED (no activation time): ${reason}`);
            continue;
          }
          
          const hoursSinceActivation = (now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60);
          console.log(`[ROI CHECK] Hours since activation: ${hoursSinceActivation.toFixed(2)}h`);
          console.log(`[ROI CHECK] Activated at: ${activatedAt.toISOString()}`);
          console.log(`[ROI CHECK] Now (UTC): ${now.toISOString()}`);
          
          if (hoursSinceActivation >= 24) {
            cycleCompleted = true;
            reason = `First 24h cycle completed (${hoursSinceActivation.toFixed(2)}h passed)`;
          } else {
            reason = `Trade still running - ${(24 - hoursSinceActivation).toFixed(2)}h remaining in first 24h cycle`;
          }
        } else {
          // SUBSEQUENT CYCLES: Check if 24h have passed since last ROI
          const lastReturnDate = new Date(investment.lastReturnDate);
          const hoursSinceLastReturn = (now.getTime() - lastReturnDate.getTime()) / (1000 * 60 * 60);
          
          console.log(`[ROI CHECK] Hours since last ROI: ${hoursSinceLastReturn.toFixed(2)}h`);
          console.log(`[ROI CHECK] Last ROI date: ${lastReturnDate.toISOString()}`);
          console.log(`[ROI CHECK] Now (UTC): ${now.toISOString()}`);
          
          if (hoursSinceLastReturn >= 24) {
            cycleCompleted = true;
            reason = `Next 24h cycle completed (${hoursSinceLastReturn.toFixed(2)}h passed)`;
          } else {
            reason = `Current trade cycle still running - ${(24 - hoursSinceLastReturn).toFixed(2)}h remaining`;
          }
        }

        console.log(`[ROI CHECK] Cycle Status: ${cycleCompleted ? '✓ COMPLETED' : '✗ NOT COMPLETED'}`);
        console.log(`[ROI CHECK] Reason: ${reason}`);

        if (!cycleCompleted) {
          console.log(`[ROI CHECK] ✗ SKIPPED (trade still active): ${reason}`);
          console.log(`[ROI CHECK] ========================================\n`);
          continue; // Skip - trade is still active, do NOT credit ROI yet
        }

        // ============================================
        // STEP 1: ATOMIC LOCK - Prevent parallel execution
        // ============================================
        const lockedInvestment = await Investment.findOneAndUpdate(
          {
            _id: investment._id,
            processingReturn: false // Only proceed if NOT already processing
          },
          {
            processingReturn: true,
            processingReturnStartedAt: new Date()
          },
          { new: true }
        );

        if (!lockedInvestment) {
          console.log(`[ROI CHECK] ✗ SKIPPED (already processing): Investment ${investment._id} is locked`);
          console.log(`[ROI CHECK] ========================================\n`);
          continue;
        }

        console.log(`[ROI CHECK] ✓ LOCK ACQUIRED for processing`);

        // ============================================
        // STEP 2: DOUBLE-PAYMENT CHECK
        // ============================================
        // Verify ROI hasn't already been credited for this cycle
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        
        const alreadyPaidToday = investment.returnHistory?.find(entry => {
          const entryDate = new Date(entry.date);
          entryDate.setUTCHours(0, 0, 0, 0);
          return entryDate.getTime() === today.getTime();
        });

        if (alreadyPaidToday) {
          console.log(`[ROI CHECK] ✗ SKIPPED (double-payment prevention): Already paid today`);
          await Investment.findByIdAndUpdate(investment._id, {
            processingReturn: false,
            processingReturnStartedAt: null
          });
          console.log(`[ROI CHECK] ========================================\n`);
          continue;
        }

        console.log(`[ROI CHECK] ✓ Double-payment check passed`);

        // ============================================
        // STEP 3: CALCULATE ROI
        // ============================================
        const baseAmount = investment.amount + investment.totalReturnsEarned;
        const dailyReturn = baseAmount * (investment.dailyReturnPercent / 100);
        
        console.log(`[ROI CHECK] ROI CALCULATION:`);
        console.log(`[ROI CHECK]   Base: $${baseAmount.toFixed(2)} (investment + prior returns)`);
        console.log(`[ROI CHECK]   Rate: ${investment.dailyReturnPercent}%`);
        console.log(`[ROI CHECK]   Daily ROI: $${dailyReturn.toFixed(2)}`);

        // ============================================
        // STEP 4: UPDATE INVESTMENT WITH ROI
        // ============================================
        investment.totalReturnsEarned += dailyReturn;
        investment.lastReturnDate = now;
        investment.nextReturnDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        investment.returnHistory.push({
          date: now,
          amount: dailyReturn,
          compounded: true,
          dailyReturnPercent: investment.dailyReturnPercent,
          cycleNumber: (investment.returnHistory?.length || 0) + 1
        });

        investment.processingReturn = false;
        investment.processingReturnStartedAt = null;
        
        await investment.save();
        
        console.log(`[ROI CHECK] ✓ INVESTMENT UPDATED`);

        // ============================================
        // STEP 5: CREATE TRANSACTION RECORD
        // ============================================
        const transaction = new Transaction({
          userId: investment.userId,
          type: 'daily_trade_return',
          amount: dailyReturn,
          investmentId: investment._id,
          status: 'confirmed',
          confirmedAt: now,
          details: {
            dailyReturnPercent: investment.dailyReturnPercent,
            baseAmount: baseAmount,
            cycleNumber: investment.returnHistory.length
          }
        });
        
        await transaction.save();
        console.log(`[ROI CHECK] ✓ TRANSACTION CREATED: ${transaction._id}`);

        // ============================================
        // STEP 6: UPDATE USER BALANCE
        // ============================================
        const user = await User.findById(investment.userId);
        if (!user) {
          console.error(`[ROI CHECK] ERROR: User ${investment.userId} not found`);
          continue;
        }

        const balanceBefore = user.currentBalance;
        
        user.totalEarnings = (user.totalEarnings || 0) + dailyReturn;
        user.investmentReturns = (user.investmentReturns || 0) + dailyReturn;
        user.currentBalance += dailyReturn;
        
        await user.save();
        
        console.log(`[ROI CHECK] ✓ USER BALANCE UPDATED`);
        console.log(`[ROI CHECK]   User: ${user.email}`);
        console.log(`[ROI CHECK]   Credit: $${dailyReturn.toFixed(2)}`);
        console.log(`[ROI CHECK]   Balance before: $${balanceBefore.toFixed(2)}`);
        console.log(`[ROI CHECK]   Balance after: $${user.currentBalance.toFixed(2)}`);

        console.log(`[ROI CHECK] ✓ ROI CREDITED SUCCESSFULLY`);
        console.log(`[ROI CHECK] ✓ Next cycle eligible: ${investment.nextReturnDate.toISOString()}`);
        console.log(`[ROI CHECK] ========================================\n`);

      } catch (investmentError) {
        console.error(`[ROI CHECK] ERROR processing investment ${investment._id}:`, investmentError);
        
        try {
          await Investment.findByIdAndUpdate(investment._id, {
            processingReturn: false,
            processingReturnStartedAt: null
          });
          console.log(`[ROI CHECK] ✓ LOCK RELEASED after error`);
        } catch (lockError) {
          console.error(`[ROI CHECK] CRITICAL: Failed to release lock:`, lockError);
        }
        console.log(`[ROI CHECK] ========================================\n`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ReturnsService] ✓ DAILY RETURNS CALCULATION COMPLETED in ${duration}ms`);
    
  } catch (error) {
    console.error('[ReturnsService] CRITICAL ERROR:', error);
  }
};

/**
 * Start automatic daily returns (runs at midnight UTC, ONLY ONCE)
 * Prevents duplicate scheduler instances on server restart
 */
export const startDailyReturnsScheduler = () => {
  // CRITICAL: Guard against multiple scheduler initializations
  if (schedulerInitialized) {
    console.log('[ReturnsService] ⚠️  Scheduler already initialized - SKIPPING duplicate init');
    return;
  }

  schedulerInitialized = true;
  console.log('[ReturnsService] ✓ Scheduler initialization: LOCKED');

  // Get time until next midnight UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  console.log(`[ReturnsService] Scheduler initialized:`, {
    currentTimeUTC: now.toISOString(),
    nextMidnightUTC: tomorrow.toISOString(),
    timeUntilNextRunMinutes: Math.round(timeUntilMidnight / 1000 / 60),
    timeUntilNextRunHours: (timeUntilMidnight / 1000 / 60 / 60).toFixed(2)
  });
  
  // Schedule first run at next midnight UTC
  setTimeout(() => {
    console.log(`[ReturnsService] ✓ First scheduled run triggered at ${new Date().toISOString()}`);
    calculateDailyReturns();
    
    // Run daily after first run (every 24 hours UTC-aligned)
    const dailyInterval = setInterval(() => {
      const runTime = new Date();
      console.log(`[ReturnsService] ✓ Daily scheduled run triggered at ${runTime.toISOString()}`);
      calculateDailyReturns();
    }, 24 * 60 * 60 * 1000);

    // Log interval ID for debugging
    console.log(`[ReturnsService] Daily interval set: runs every 24 hours starting from next midnight UTC`);
    
  }, timeUntilMidnight);
};

export default {
  calculateDailyReturns,
  startDailyReturnsScheduler
};
