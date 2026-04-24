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
    console.log(`[ReturnsService] Starting daily returns calculation at ${new Date().toISOString()}`);

    // Find all active investments that are at least 24h old
    const activeInvestments = await Investment.find({ 
      status: 'active',
      activatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    console.log(`[ReturnsService] Found ${activeInvestments.length} active investments eligible for ROI check`);
    
    for (const investment of activeInvestments) {
      try {
        // ============================================
        // STEP 1: ATOMIC LOCK - Prevent parallel execution
        // ============================================
        // Use findOneAndUpdate to atomically acquire lock
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
          console.log(`[ReturnsService] ⚠️  SKIPPED (locked): Investment ${investment._id} already being processed`);
          continue;
        }

        console.log(`[ReturnsService] ✓ LOCK ACQUIRED for Investment ${investment._id}`);

        // ============================================
        // STEP 2: STRICT 24-HOUR VALIDATION (UTC only)
        // ============================================
        const now = new Date();
        const lastReturnDate = investment.lastReturnDate ? new Date(investment.lastReturnDate) : null;
        
        let shouldProcessReturn = false;
        let reason = '';

        if (!lastReturnDate) {
          // First return ever - process immediately
          shouldProcessReturn = true;
          reason = 'First ROI payout (no lastReturnDate)';
        } else {
          // Calculate time elapsed in milliseconds
          const timeSinceLastReturn = now.getTime() - lastReturnDate.getTime();
          const twentyFourHoursMs = 24 * 60 * 60 * 1000;
          
          if (timeSinceLastReturn >= twentyFourHoursMs) {
            shouldProcessReturn = true;
            reason = `${(timeSinceLastReturn / 1000 / 60 / 60).toFixed(2)} hours since last return (>= 24h)`;
          } else {
            reason = `Only ${(timeSinceLastReturn / 1000 / 60 / 60).toFixed(2)} hours since last return (< 24h)`;
          }
        }

        // Log 24-hour validation decision
        console.log(`[ReturnsService] 24H VALIDATION:`, {
          investmentId: investment._id.toString(),
          lastReturnDate: lastReturnDate ? lastReturnDate.toISOString() : 'NEVER',
          nowUTC: now.toISOString(),
          timeSinceLast: lastReturnDate ? `${((now.getTime() - lastReturnDate.getTime()) / 1000 / 60 / 60).toFixed(2)}h` : 'N/A',
          decision: shouldProcessReturn ? '✓ PROCESS' : '✗ SKIP',
          reason: reason
        });

        if (!shouldProcessReturn) {
          // Release lock and skip
          await Investment.findByIdAndUpdate(investment._id, {
            processingReturn: false,
            processingReturnStartedAt: null
          });
          console.log(`[ReturnsService] ✗ SKIPPED: ${reason}`);
          continue;
        }

        // ============================================
        // STEP 3: CALCULATE ROI (unchanged calculation logic)
        // ============================================
        const baseAmount = investment.amount + investment.totalReturnsEarned;
        const dailyReturn = baseAmount * (investment.dailyReturnPercent / 100);
        
        console.log(`[ReturnsService] ROI CALCULATION:`, {
          investmentId: investment._id.toString(),
          baseAmount: baseAmount.toFixed(2),
          dailyReturnPercent: investment.dailyReturnPercent,
          calculatedReturn: dailyReturn.toFixed(2),
          formula: `$${baseAmount.toFixed(2)} * ${investment.dailyReturnPercent}% = $${dailyReturn.toFixed(2)}`
        });

        // ============================================
        // STEP 4: UPDATE INVESTMENT WITH ROI
        // ============================================
        const nowUTC = new Date(); // UTC timestamp
        
        investment.totalReturnsEarned += dailyReturn;
        investment.lastReturnDate = nowUTC; // CRITICAL: Store UTC timestamp
        investment.nextReturnDate = new Date(nowUTC.getTime() + 24 * 60 * 60 * 1000);
        
        // Add to return history (for record-keeping, NOT for validation)
        investment.returnHistory.push({
          date: nowUTC,
          amount: dailyReturn,
          compounded: true,
          dailyReturnPercent: investment.dailyReturnPercent
        });

        // Release lock ONLY after successful update
        investment.processingReturn = false;
        investment.processingReturnStartedAt = null;
        
        await investment.save();
        
        console.log(`[ReturnsService] ✓ INVESTMENT UPDATED: Investment ${investment._id}, ROI: $${dailyReturn.toFixed(2)}`);

        // ============================================
        // STEP 5: CREATE TRANSACTION RECORD
        // ============================================
        const transaction = new Transaction({
          userId: investment.userId,
          type: 'return',
          amount: dailyReturn,
          investmentId: investment._id,
          status: 'confirmed',
          confirmedAt: nowUTC
        });
        
        await transaction.save();
        console.log(`[ReturnsService] ✓ TRANSACTION CREATED: ${transaction._id}`);

        // ============================================
        // STEP 6: UPDATE USER BALANCE (SINGLE UPDATE)
        // ============================================
        const user = await User.findById(investment.userId);
        if (!user) {
          console.error(`[ReturnsService] ERROR: User ${investment.userId} not found`);
          continue;
        }

        const balanceBefore = user.currentBalance;
        const earningsBefore = user.totalEarnings;
        
        // CRITICAL: Single balance update to prevent double-crediting
        user.totalEarnings = (user.totalEarnings || 0) + dailyReturn;
        user.investmentReturns = (user.investmentReturns || 0) + dailyReturn;
        user.currentBalance += dailyReturn;
        
        await user.save();
        
        console.log(`[ReturnsService] ✓ USER BALANCE UPDATED:`, {
          userId: user._id.toString(),
          email: user.email,
          creditAmount: dailyReturn.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: user.currentBalance.toFixed(2),
          earningsBefore: earningsBefore.toFixed(2),
          earningsAfter: user.totalEarnings.toFixed(2)
        });

        // Log transaction with balance snapshot
        await transactionLogger.logBalanceTransaction(user._id, 'investment_return', dailyReturn, {
          investmentId: investment._id,
          dailyReturnPercent: investment.dailyReturnPercent,
          description: `Daily return: ${investment.dailyReturnPercent}% on $${investment.amount.toFixed(2)}`,
          transactionId: transaction._id,
          processingTime: `${Date.now() - startTime}ms`
        });

        console.log(`[ReturnsService] ✓ COMPLETED: Investment ${investment._id} - ROI $${dailyReturn.toFixed(2)} credited`);

      } catch (investmentError) {
        console.error(`[ReturnsService] ERROR processing investment ${investment._id}:`, investmentError);
        
        // CRITICAL: Always release lock on error
        try {
          await Investment.findByIdAndUpdate(investment._id, {
            processingReturn: false,
            processingReturnStartedAt: null
          });
          console.log(`[ReturnsService] ✓ LOCK RELEASED after error for ${investment._id}`);
        } catch (lockReleaseError) {
          console.error(`[ReturnsService] CRITICAL: Failed to release lock for ${investment._id}:`, lockReleaseError);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ReturnsService] Daily returns calculation completed in ${duration}ms`);
    
  } catch (error) {
    console.error('[ReturnsService] CRITICAL ERROR in calculateDailyReturns:', error);
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
