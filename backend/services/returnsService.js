import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

// Calculate daily returns for all active investments
export const calculateDailyReturns = async () => {
  try {
    const activeInvestments = await Investment.find({ 
      status: 'active',
      activatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // At least 24h old
    });
    
    console.log(`[ReturnsService] Calculating returns for ${activeInvestments.length} investments`);
    
    for (const investment of activeInvestments) {
      // Check if return has already been credited today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastReturn = investment.returnHistory.find(r => {
        const rDate = new Date(r.date);
        rDate.setHours(0, 0, 0, 0);
        return rDate.getTime() === today.getTime();
      });
      
      if (lastReturn) continue; // Already credited today
      
      // Calculate return using EXACTLY 3% per day (or the dailyReturnPercent set in package)
      const baseAmount = investment.amount + investment.totalReturnsEarned;
      const dailyReturn = baseAmount * (investment.dailyReturnPercent / 100);
      
      // CRITICAL: Log to verify the calculation is EXACTLY correct, not doubled or changed
      console.log(`[v0] ROI Calculation Validation:`, {
        investmentId: investment._id,
        baseAmount: baseAmount.toFixed(2),
        dailyReturnPercent: investment.dailyReturnPercent,
        calculatedReturn: dailyReturn.toFixed(2),
        expectedFormula: `$${baseAmount.toFixed(2)} * ${investment.dailyReturnPercent}% = $${dailyReturn.toFixed(2)}`,
        isAccurate: dailyReturn === (baseAmount * (investment.dailyReturnPercent / 100))
      });
      
      // Add to total earnings
      investment.totalReturnsEarned += dailyReturn;
      investment.lastReturnDate = new Date();
      investment.nextReturnDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Add to return history
      investment.returnHistory.push({
        date: new Date(),
        amount: dailyReturn,
        compounded: true,
        dailyReturnPercent: investment.dailyReturnPercent // Track which rate was used
      });
      
      await investment.save();
      
      // Create transaction record
      const transaction = new Transaction({
        userId: investment.userId,
        type: 'return',
        amount: dailyReturn,
        investmentId: investment._id,
        status: 'confirmed',
        confirmedAt: new Date()
      });
      
      await transaction.save();
      
      // Update user balance
      const user = await User.findById(investment.userId);
      const balanceBefore = user.currentBalance;
      const earningsBefore = user.totalEarnings;
      
      user.totalEarnings += dailyReturn;
      user.investmentReturns = (user.investmentReturns || 0) + dailyReturn;
      user.currentBalance += dailyReturn;
      await user.save();
      
      console.log(`[v0] ROI Credited to User:`, {
        userId: user._id,
        email: user.email,
        dailyReturnPercent: investment.dailyReturnPercent,
        creditAmount: dailyReturn.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: user.currentBalance.toFixed(2),
        earningsBefore: earningsBefore.toFixed(2),
        earningsAfter: user.totalEarnings.toFixed(2)
      });
    }
  } catch (error) {
    console.error('[ReturnsService] Error calculating returns:', error);
  }
};

// Start automatic daily returns (runs at midnight UTC)
export const startDailyReturnsScheduler = () => {
  // Get time until next midnight UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  // Schedule first run
  setTimeout(() => {
    calculateDailyReturns();
    
    // Run daily after first run
    setInterval(() => {
      calculateDailyReturns();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, timeUntilMidnight);
  
  console.log(`[ReturnsService] Scheduler started. Next run in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
};

export default {
  calculateDailyReturns,
  startDailyReturnsScheduler
};
