'use client';

import { useRealTimeBalance } from '@/hooks/useRealTimeBalance';
import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Lock, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

// Helper function to format balance (not a hook)
function formatBalance(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }

  return parseFloat(amount.toString()).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function AvailableBalanceWidget() {
  const { balance, isLoading, error } = useRealTimeBalance();
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Update withdrawal lock time remaining
  useEffect(() => {
    if (!balance?.withdrawalLockUntil) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      const now = new Date().getTime();
      const lockTime = new Date(balance.withdrawalLockUntil!).getTime();
      const diff = lockTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [balance?.withdrawalLockUntil]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  if (error || !balance) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-900">Unable to load balance</p>
            <p className="text-xs text-red-700">{error || 'Please refresh the page'}</p>
          </div>
        </div>
      </Card>
    );
  }

  const formattedAvailable = formatBalance(balance.availableBalance);
  const formattedTotal = formatBalance(balance.totalBalance);
  const formattedLocked = formatBalance(balance.lockedInTrades);
  const formattedPending = formatBalance(balance.pendingWithdrawal);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Available Balance Card */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider">
              Available Balance
            </p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              ${formattedAvailable}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Ready to withdraw or spend
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
        </div>
      </Card>

      {/* Total Balance Card */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Total Balance
            </p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              ${formattedTotal}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Includes locked & pending
            </p>
          </div>
        </div>
      </Card>

      {/* Locked Funds Card */}
      {balance.lockedInTrades > 0 && (
        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-700 uppercase tracking-wider">
                Locked in Trades
              </p>
              <p className="text-2xl font-bold text-yellow-900 mt-2">
                ${formattedLocked}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                In active trading
              </p>
            </div>
            <Lock className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </Card>
      )}

      {/* Pending Withdrawal Card */}
      {balance.pendingWithdrawal > 0 && (
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">
                Pending Withdrawal
              </p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                ${formattedPending}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {balance.pendingWithdrawalsCount} request(s)
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </Card>
      )}

      {/* Withdrawal Lock Status */}
      {timeRemaining && (
        <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200 md:col-span-2 lg:col-span-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Funds Locked for Withdrawal
              </p>
              <p className="text-lg font-bold text-red-900 mt-2">
                Available in {timeRemaining}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Your funds are locked after trade completion. You can withdraw after the lock period expires.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Earnings Breakdown */}
      <Card className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 md:col-span-1">
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wider">
          Earnings
        </p>
        <p className="text-xl font-bold text-gray-900 mt-2">
          ${formatBalance(balance.totalEarnings)}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          From trading returns
        </p>
      </Card>

      {/* Bonuses Card */}
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 md:col-span-1">
        <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">
          Bonuses
        </p>
        <p className="text-xl font-bold text-amber-900 mt-2">
          ${formatBalance(balance.totalDeposited)}
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Total deposited
        </p>
      </Card>

      {/* PowaUp Balance */}
      <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 md:col-span-1">
        <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">
          PowaUp Balance
        </p>
        <p className="text-xl font-bold text-teal-900 mt-2">
          {balance.powaUpBalance}
        </p>
        <p className="text-xs text-teal-600 mt-1">
          Credits for trading
        </p>
      </Card>
    </div>
  );
}
