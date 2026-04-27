'use client';

import React, { useState, useEffect } from 'react';
import { Lock, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface LockedFundsDisplayProps {
  investments: any[];
}

export default function LockedFundsDisplay({ investments = [] }: LockedFundsDisplayProps) {
  const [lockedFunds, setLockedFunds] = useState(0);
  const [activeTradesCount, setActiveTradesCount] = useState(0);
  const [totalPendingProfit, setTotalPendingProfit] = useState(0);

  useEffect(() => {
    if (!investments || investments.length === 0) return;

    // Calculate locked funds from active trades
    const totalLocked = investments.reduce((sum, inv) => {
      if (inv.tradeInProgress && inv.lockedAmount) {
        return sum + inv.lockedAmount;
      }
      return sum;
    }, 0);

    // Count active trades
    const activeCount = investments.filter(inv => inv.tradeInProgress).length;

    // Calculate estimated profit from active trades
    const estimatedProfit = investments.reduce((sum, inv) => {
      if (inv.tradeInProgress && inv.lockedAmount) {
        const profit = (inv.lockedAmount * (inv.dailyReturnPercent || 10)) / 100;
        return sum + profit;
      }
      return sum;
    }, 0);

    setLockedFunds(totalLocked);
    setActiveTradesCount(activeCount);
    setTotalPendingProfit(estimatedProfit);
  }, [investments]);

  if (lockedFunds === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 sm:p-6 w-full overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 w-full">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20">
              <Lock className="text-amber-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Funds Locked in Trading</h3>
              <p className="text-sm text-amber-800">
                {activeTradesCount} active {activeTradesCount === 1 ? 'trade' : 'trades'} in progress
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 w-full">
          {/* Locked Amount */}
          <div className="p-3 sm:p-4 rounded-lg bg-white/50 backdrop-blur min-w-0">
            <p className="text-xs sm:text-sm text-amber-700 font-semibold mb-2 break-words">AMOUNT LOCKED</p>
            <p className="text-lg sm:text-2xl font-bold text-amber-900 break-words">
              ${lockedFunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-700 mt-1 break-words">Cannot be withdrawn</p>
          </div>

          {/* Pending Profit */}
          <div className="p-3 sm:p-4 rounded-lg bg-white/50 backdrop-blur min-w-0">
            <p className="text-xs sm:text-sm text-green-700 font-semibold mb-2 flex items-center gap-2 break-words">
              <TrendingUp size={12} className="flex-shrink-0" />
              ESTIMATED PROFIT
            </p>
            <p className="text-lg sm:text-2xl font-bold text-green-600 break-words">
              +${totalPendingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-700 mt-1 break-words">After 24-hour completion</p>
          </div>

          {/* Time Status */}
          <div className="p-3 sm:p-4 rounded-lg bg-white/50 backdrop-blur min-w-0">
            <p className="text-xs sm:text-sm text-blue-700 font-semibold mb-2 flex items-center gap-2 break-words">
              <Clock size={12} className="flex-shrink-0" />
              LOCK STATUS
            </p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 break-words">{activeTradesCount}</p>
            <p className="text-xs text-blue-700 mt-1 break-words">
              {activeTradesCount === 1 ? 'Trade' : 'Trades'} in 24h cycle
            </p>
          </div>
        </div>

        {/* Warning Info */}
        <div className="p-3 sm:p-4 rounded-lg bg-white/40 border border-amber-500/30 flex gap-2 sm:gap-3 w-full min-w-0">
          <AlertCircle className="text-amber-700 flex-shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
          <div className="text-xs sm:text-sm text-amber-800 min-w-0 break-words">
            <p className="font-semibold">Your funds are temporarily locked</p>
            <p className="mt-1">
              This is by design to ensure secure trading. Your money will be returned with profits once the 24-hour period ends. You cannot withdraw locked funds until trading is complete.
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="text-xs text-amber-700 space-y-1 w-full">
          <p className="break-words">
            <strong className="text-amber-900">How it works:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 break-words">
            <li>Funds are locked immediately when you place a trade</li>
            <li>Real-time trading occurs with your locked amount</li>
            <li>After 24 hours, profit is automatically added to your balance</li>
            <li>Your original amount is also returned to your account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
