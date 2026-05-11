import mongoose from 'mongoose';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import Activity from '../models/Activity.js';
import GameReward from '../models/GameReward.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
// Support running from both 'backend/' and 'backend/scripts/' directories
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Validate that MongoDB URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('[Recovery] CRITICAL ERROR: MONGODB_URI is not set!');
  console.error(`[Recovery] Tried to load from: ${envPath}`);
  console.error('[Recovery] Please ensure backend/.env contains MONGODB_URI');
  process.exit(1);
}

console.log('[Recovery] MongoDB URI loaded:', !!process.env.MONGODB_URI);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}=== ${msg} ===${colors.reset}\n`)
};

// Configuration
const config = {
  dryRun: process.argv.includes('--dry-run'),
  userId: process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1],
  verbose: process.argv.includes('--verbose'),
  generateReport: process.argv.includes('--report'),
  autoFix: process.argv.includes('--fix') && !process.argv.includes('--dry-run')
};

/**
 * Calculate TRUE expected balance from ALL transaction history
 * Uses transactions as single source of truth
 */
async function calculateExpectedBalance(userId) {
  try {
    // Get all transactions for this user
    const transactions = await Transaction.find({ userId });
    
    let expectedBalance = 0;
    const breakdown = {
      deposits: 0,
      withdrawals: 0,
      investmentReturns: 0,
      giveawayReceived: 0,
      giveawaySent: 0,
      referralCommissions: 0,
      activityRewards: 0,
      gameRewards: 0,
      adminGrants: 0,
      bonuses: 0
    };
    
    // Process each transaction
    for (const tx of transactions) {
      if (!tx.amount || tx.amount < 0) continue; // Skip invalid amounts
      
      switch (tx.type) {
        case 'deposit':
          if (tx.status === 'confirmed') {
            expectedBalance += tx.amount;
            breakdown.deposits += tx.amount;
          }
          break;
          
        case 'withdrawal':
          if (['completed', 'confirmed'].includes(tx.status)) {
            expectedBalance -= tx.amount;
            breakdown.withdrawals += tx.amount;
          }
          break;
          
        case 'return':
        case 'returns':
          if (tx.status === 'confirmed') {
            expectedBalance += tx.amount;
            breakdown.investmentReturns += tx.amount;
          }
          break;
          
        case 'giveaway_received':
          if (tx.status === 'confirmed') {
            expectedBalance += tx.amount;
            breakdown.giveawayReceived += tx.amount;
          }
          break;
          
        case 'giveaway_sent':
          if (tx.status === 'confirmed') {
            expectedBalance -= tx.amount;
            breakdown.giveawaySent += tx.amount;
          }
          break;
          
        case 'referral_commission':
          if (tx.status === 'confirmed') {
            expectedBalance += tx.amount;
            breakdown.referralCommissions += tx.amount;
          }
          break;
          
        case 'activity_reward':
          if (tx.status === 'confirmed') {
            expectedBalance += tx.amount;
            breakdown.activityRewards += tx.amount;
          }
          break;
          
        case 'transfer':
          // Handled as giveaway_sent/received
          break;
          
        case 'powaup_sent':
        case 'powaup_received':
          // PowaUp rewards - track separately but add to balance
          if (tx.status === 'confirmed') {
            if (tx.type === 'powaup_received') {
              expectedBalance += tx.amount;
            } else if (tx.type === 'powaup_sent') {
              expectedBalance -= tx.amount;
            }
          }
          break;
      }
    }
    
    // Add game rewards (from GameReward collection)
    const gameRewards = await GameReward.find({ userId });
    const gameRewardTotal = gameRewards.reduce((sum, gr) => sum + (gr.amount || 0), 0);
    expectedBalance += gameRewardTotal;
    breakdown.gameRewards = gameRewardTotal;
    
    // Add investment returns from Investment collection's returnHistory
    const investments = await Investment.find({ userId });
    let investmentReturnTotal = 0;
    for (const inv of investments) {
      if (inv.returnHistory && Array.isArray(inv.returnHistory)) {
        investmentReturnTotal += inv.returnHistory.reduce((sum, r) => sum + (r.amount || 0), 0);
      }
    }
    // Note: Already counted in transactions, but verify consistency
    
    // Ensure balance is never negative
    expectedBalance = Math.max(0, expectedBalance);
    
    return {
      expectedBalance: Math.round(expectedBalance * 100) / 100,
      breakdown,
      transactionCount: transactions.length,
      gameRewardCount: gameRewards.length,
      investmentCount: investments.length
    };
  } catch (error) {
    log.error(`Error calculating expected balance for user ${userId}: ${error.message}`);
    return null;
  }
}

/**
 * Audit a single user's balance
 */
async function auditUserBalance(user) {
  const expected = await calculateExpectedBalance(user._id);
  if (!expected) return null;
  
  const currentBalance = user.currentBalance || 0;
  const discrepancy = expected.expectedBalance - currentBalance;
  const hasIssue = Math.abs(discrepancy) > 0.01; // Allow 0.01 USD tolerance for rounding
  
  return {
    userId: user._id,
    fullName: user.fullName,
    email: user.email,
    currentBalance,
    expectedBalance: expected.expectedBalance,
    discrepancy,
    hasIssue,
    status: hasIssue ? 'REQUIRES_FIX' : 'OK',
    breakdown: expected.breakdown,
    transactionCount: expected.transactionCount,
    gameRewardCount: expected.gameRewardCount,
    investmentCount: expected.investmentCount
  };
}

/**
 * Perform atomic balance recovery with MongoDB transaction
 */
async function recoverUserBalance(user, expectedBalance) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const currentBalance = user.currentBalance || 0;
    const difference = expectedBalance - currentBalance;
    
    if (Math.abs(difference) < 0.01) {
      if (config.verbose) {
        log.info(`User ${user.email}: Balance already correct (${currentBalance} USD)`);
      }
      await session.commitTransaction();
      return { status: 'SKIPPED', reason: 'Balance already correct' };
    }
    
    // Update user balance
    const result = await User.findByIdAndUpdate(
      user._id,
      {
        currentBalance: expectedBalance,
        updatedAt: new Date()
      },
      { session, new: true }
    );
    
    // Log recovery transaction
    const recoveryTx = new Transaction({
      userId: user._id,
      type: 'adjustment',
      amount: Math.abs(difference),
      description: difference > 0 
        ? `Balance recovery: Missing funds restored (+${difference.toFixed(2)} USD)`
        : `Balance correction: Removed duplicate balance (${difference.toFixed(2)} USD)`,
      status: 'confirmed',
      confirmedBy: new mongoose.Types.ObjectId('000000000000000000000000'), // System
      confirmedAt: new Date(),
      createdAt: new Date()
    });
    
    await recoveryTx.save({ session });
    
    await session.commitTransaction();
    
    return {
      status: 'RECOVERED',
      before: currentBalance,
      after: expectedBalance,
      difference,
      transactionId: recoveryTx._id
    };
  } catch (error) {
    await session.abortTransaction();
    log.error(`Recovery failed for user ${user._id}: ${error.message}`);
    return {
      status: 'FAILED',
      error: error.message
    };
  } finally {
    await session.endSession();
  }
}

/**
 * Generate comprehensive audit report
 */
async function generateAuditReport(auditResults) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      totalUsers: auditResults.length,
      usersWithIssues: auditResults.filter(r => r.hasIssue).length,
      totalMissingFunds: 0,
      totalOverpaidFunds: 0,
      recovered: 0,
      skipped: 0,
      failed: 0
    },
    affectedUsers: [],
    recommendations: []
  };
  
  for (const audit of auditResults) {
    if (audit.hasIssue) {
      report.affectedUsers.push({
        userId: audit.userId,
        email: audit.email,
        currentBalance: audit.currentBalance,
        expectedBalance: audit.expectedBalance,
        discrepancy: audit.discrepancy,
        direction: audit.discrepancy > 0 ? 'MISSING' : 'OVERPAID'
      });
      
      if (audit.discrepancy > 0) {
        report.summary.totalMissingFunds += audit.discrepancy;
      } else {
        report.summary.totalOverpaidFunds += Math.abs(audit.discrepancy);
      }
    }
  }
  
  // Generate recommendations
  if (report.summary.usersWithIssues > 0) {
    report.recommendations.push(
      `Run recovery with: node recover-user-balances.js --fix --report`,
      `Review transaction logs for affected users`,
      `Monitor balance operations for next 7 days`
    );
  } else {
    report.recommendations.push(
      `All user balances are consistent`,
      `No recovery needed at this time`
    );
  }
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    log.header('BALANCE RECOVERY AUDIT SYSTEM');
    log.info(`Mode: ${config.dryRun ? 'DRY RUN (Preview)' : 'LIVE EXECUTION'}`);
    log.info(`Timestamp: ${new Date().toISOString()}`);
    
    if (config.dryRun) {
      log.warn('DRY RUN MODE - No changes will be made');
    }
    if (config.autoFix) {
      log.warn('AUTO-FIX ENABLED - Balances will be corrected');
    }
    
    // Get users to audit
    let users;
    if (config.userId) {
      users = [await User.findById(config.userId)];
      if (!users[0]) {
        log.error(`User not found: ${config.userId}`);
        process.exit(1);
      }
      log.info(`Auditing single user: ${users[0].email}`);
    } else {
      users = await User.find({ isDeleted: false }).select('+email');
      log.info(`Auditing ${users.length} users...`);
    }
    
    // Audit each user
    log.header('AUDIT PHASE');
    const auditResults = [];
    const recoveryResults = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const audit = await auditUserBalance(user);
      
      if (audit) {
        auditResults.push(audit);
        
        if (audit.hasIssue) {
          if (config.verbose) {
            log.warn(`${user.email}: Balance issue detected`);
            log.info(`  Current: ${audit.currentBalance.toFixed(2)} USD`);
            log.info(`  Expected: ${audit.expectedBalance.toFixed(2)} USD`);
            log.info(`  Discrepancy: ${audit.discrepancy.toFixed(2)} USD`);
          }
          
          // Recovery phase
          if (config.autoFix && !config.dryRun) {
            log.info(`Recovering balance for ${user.email}...`);
            const recovery = await recoverUserBalance(user, audit.expectedBalance);
            recoveryResults.push({
              userId: user._id,
              email: user.email,
              ...recovery
            });
            
            if (recovery.status === 'RECOVERED') {
              log.success(`Recovered ${Math.abs(recovery.difference).toFixed(2)} USD for ${user.email}`);
            }
          }
        } else if (config.verbose) {
          log.success(`${user.email}: Balance OK`);
        }
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        log.info(`Progress: ${i + 1}/${users.length}`);
      }
    }
    
    // Generate report
    log.header('AUDIT SUMMARY');
    const report = await generateAuditReport(auditResults);
    
    log.info(`Total users audited: ${report.summary.totalUsers}`);
    log.info(`Users with issues: ${report.summary.usersWithIssues}`);
    log.info(`Total missing funds: $${report.summary.totalMissingFunds.toFixed(2)}`);
    log.info(`Total overpaid funds: $${report.summary.totalOverpaidFunds.toFixed(2)}`);
    
    if (report.summary.usersWithIssues > 0) {
      log.warn(`\nAffected users:`);
      report.affectedUsers.slice(0, 10).forEach(user => {
        log.info(`  ${user.email}: ${user.direction === 'MISSING' ? '+' : '-'}$${Math.abs(user.discrepancy).toFixed(2)}`);
      });
      if (report.affectedUsers.length > 10) {
        log.info(`  ... and ${report.affectedUsers.length - 10} more`);
      }
    }
    
    // Recovery summary
    if (recoveryResults.length > 0) {
      log.header('RECOVERY SUMMARY');
      const recovered = recoveryResults.filter(r => r.status === 'RECOVERED');
      const failed = recoveryResults.filter(r => r.status === 'FAILED');
      
      log.success(`Recovered: ${recovered.length} users`);
      if (failed.length > 0) {
        log.error(`Failed: ${failed.length} users`);
      }
      
      if (recovered.length > 0) {
        const totalRecovered = recovered.reduce((sum, r) => sum + Math.abs(r.difference), 0);
        log.success(`Total funds recovered: $${totalRecovered.toFixed(2)}`);
      }
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      log.header('RECOMMENDATIONS');
      report.recommendations.forEach(rec => {
        log.info(`• ${rec}`);
      });
    }
    
    // Save report if requested
    if (config.generateReport) {
      const fs = await import('fs');
      const reportFile = `balance-audit-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify({
        report,
        auditResults: config.verbose ? auditResults : undefined,
        recoveryResults: recoveryResults.length > 0 ? recoveryResults : undefined
      }, null, 2));
      log.success(`Report saved to: ${reportFile}`);
    }
    
    await mongoose.disconnect();
    log.success('\nAudit complete!');
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Display help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Balance Recovery Audit System

Usage: node recover-user-balances.js [options]

Options:
  --dry-run       Preview changes without applying them
  --fix           Apply balance corrections (auto-recovery)
  --user=ID       Audit specific user by ID
  --verbose       Show detailed output for each user
  --report        Generate JSON audit report
  --help          Show this help message

Examples:
  # Preview all issues
  node recover-user-balances.js --dry-run --report
  
  # Fix all issues
  node recover-user-balances.js --fix --report
  
  # Audit single user
  node recover-user-balances.js --user=<userId> --verbose
  `);
  process.exit(0);
}

main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
