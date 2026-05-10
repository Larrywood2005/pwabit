/**
 * CRITICAL BALANCE INTEGRITY AUDIT SCRIPT
 * 
 * Purpose: Verify and report all balance discrepancies across the system
 * Identifies users with corrupted balances and helps trace the root cause
 * 
 * Usage: node audit-balance-integrity.js [--fix]
 * --fix flag: Automatically fix identified discrepancies (use with caution)
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Investment from '../models/Investment.js';
import Transaction from '../models/Transaction.js';
import balanceService from '../services/balanceService.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/powabitz');
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err);
    process.exit(1);
  }
};

const auditUserBalance = async (user) => {
  try {
    // Get actual balance info
    const balanceInfo = await balanceService.calculateAvailableBalance(user._id);
    
    // Get all transactions
    const transactions = await Transaction.find({ userId: user._id });
    
    // Calculate totals
    const deposits = transactions
      .filter(t => t.type === 'deposit' && t.status === 'confirmed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const withdrawals = transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const investmentReturns = transactions
      .filter(t => t.type === 'returns')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const referralCommissions = transactions
      .filter(t => t.type === 'referral_commission')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const gameRewards = transactions
      .filter(t => ['game_reward', 'daily_bonus', 'activity_reward'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const bonuses = transactions
      .filter(t => t.type === 'bonus')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate expected balance
    const totalEarnings = investmentReturns + referralCommissions + gameRewards + bonuses;
    const expectedBalance = deposits - withdrawals + totalEarnings;
    const actualBalance = user.currentBalance || 0;
    const discrepancy = actualBalance - expectedBalance;
    
    const hasIssue = Math.abs(discrepancy) > 0.01; // Allow for rounding errors
    
    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      transactions: {
        confirmedDeposits: deposits,
        completedWithdrawals: withdrawals,
        investmentReturns: investmentReturns,
        referralCommissions: referralCommissions,
        gameRewards: gameRewards,
        bonuses: bonuses,
        totalEarnings: totalEarnings,
        expectedBalance: Math.max(0, expectedBalance)
      },
      balanceStatus: {
        currentBalance: actualBalance,
        expectedBalance: Math.max(0, expectedBalance),
        discrepancy: discrepancy,
        balanceFromService: balanceInfo.totalBalance,
        availableBalance: balanceInfo.availableBalance,
        lockedInTrades: balanceInfo.lockedInTrades,
        pendingWithdrawal: balanceInfo.pendingWithdrawal
      },
      hasIssue: hasIssue,
      severity: Math.abs(discrepancy) > 100 ? 'CRITICAL' : Math.abs(discrepancy) > 10 ? 'HIGH' : 'LOW'
    };
  } catch (error) {
    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      hasIssue: true,
      severity: 'ERROR',
      error: error.message
    };
  }
};

const main = async () => {
  await connectDB();
  
  console.log('\n' + '='.repeat(80));
  console.log('BALANCE INTEGRITY AUDIT');
  console.log('='.repeat(80) + '\n');
  
  const shouldFix = process.argv.includes('--fix');
  
  if (shouldFix) {
    console.log('⚠️  WARNING: Running in FIX mode - balances will be corrected');
    console.log('Make sure you have a backup before proceeding!\n');
  }
  
  // Get all users
  const users = await User.find().select('_id fullName email currentBalance totalDeposited totalWithdrawn totalEarnings totalInvested');
  console.log(`Found ${users.length} users to audit\n`);
  
  // Audit each user
  const results = [];
  let processedCount = 0;
  
  for (const user of users) {
    const auditResult = await auditUserBalance(user);
    results.push(auditResult);
    
    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`Progress: ${processedCount}/${users.length} users audited`);
    }
  }
  
  // Analyze results
  const issuesFound = results.filter(r => r.hasIssue);
  const criticalIssues = results.filter(r => r.severity === 'CRITICAL');
  const highIssues = results.filter(r => r.severity === 'HIGH');
  const errors = results.filter(r => r.severity === 'ERROR');
  
  console.log('\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Users: ${users.length}`);
  console.log(`Users with Issues: ${issuesFound.length}`);
  console.log(`  - Critical Issues: ${criticalIssues.length}`);
  console.log(`  - High Issues: ${highIssues.length}`);
  console.log(`  - Errors: ${errors.length}\n`);
  
  if (criticalIssues.length > 0) {
    console.log('CRITICAL ISSUES (Balance difference > $100):');
    console.log('-'.repeat(80));
    criticalIssues.forEach(issue => {
      console.log(`\n${issue.fullName} (${issue.email})`);
      console.log(`  Current Balance: $${issue.balanceStatus.currentBalance.toFixed(2)}`);
      console.log(`  Expected Balance: $${issue.balanceStatus.expectedBalance.toFixed(2)}`);
      console.log(`  Discrepancy: $${issue.balanceStatus.discrepancy.toFixed(2)}`);
      console.log(`  Transaction Summary:`);
      console.log(`    Deposits: $${issue.transactions.confirmedDeposits.toFixed(2)}`);
      console.log(`    Withdrawals: $${issue.transactions.completedWithdrawals.toFixed(2)}`);
      console.log(`    Earnings: $${issue.transactions.totalEarnings.toFixed(2)}`);
    });
  }
  
  if (highIssues.length > 0) {
    console.log('\n\nHIGH ISSUES (Balance difference $10-$100):');
    console.log('-'.repeat(80));
    highIssues.slice(0, 10).forEach(issue => {
      console.log(`\n${issue.fullName} (${issue.email})`);
      console.log(`  Discrepancy: $${issue.balanceStatus.discrepancy.toFixed(2)}`);
    });
    if (highIssues.length > 10) {
      console.log(`\n... and ${highIssues.length - 10} more high-severity issues`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n\nERRORS:');
    console.log('-'.repeat(80));
    errors.slice(0, 5).forEach(issue => {
      console.log(`${issue.fullName}: ${issue.error}`);
    });
  }
  
  // Summary statistics
  const totalDiscrepancy = results.reduce((sum, r) => sum + (r.balanceStatus?.discrepancy || 0), 0);
  
  console.log('\n' + '='.repeat(80));
  console.log('FINANCIAL IMPACT');
  console.log('='.repeat(80));
  console.log(`Total Balance Discrepancy Across System: $${totalDiscrepancy.toFixed(2)}`);
  console.log(`Status: ${issuesFound.length === 0 ? '✓ All balances are consistent' : '✗ Issues detected'}\n`);
  
  // FIX MODE
  if (shouldFix && criticalIssues.length > 0) {
    console.log('APPLYING FIXES...\n');
    
    for (const issue of criticalIssues) {
      try {
        const user = await User.findById(issue.userId);
        if (user) {
          const oldBalance = user.currentBalance;
          user.currentBalance = issue.balanceStatus.expectedBalance;
          await user.save();
          
          console.log(`✓ Fixed ${issue.fullName}`);
          console.log(`  Old: $${oldBalance.toFixed(2)} → New: $${user.currentBalance.toFixed(2)}`);
        }
      } catch (err) {
        console.error(`✗ Failed to fix ${issue.fullName}:`, err.message);
      }
    }
  }
  
  // Save detailed report
  const reportFile = `balance-audit-${new Date().toISOString().split('T')[0]}.json`;
  require('fs').writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      usersWithIssues: issuesFound.length,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
      errors: errors.length,
      totalDiscrepancy: totalDiscrepancy
    },
    issues: issuesFound
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportFile}`);
  
  await mongoose.connection.close();
  console.log('\n✓ Audit complete\n');
};

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
