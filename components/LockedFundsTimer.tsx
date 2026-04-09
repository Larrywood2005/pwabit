'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Clock } from 'lucide-react';

interface LockedFundsTimerProps {
  investment: any;
  onTradeComplete?: () => void;
}

export default function LockedFundsTimer({ investment, onTradeComplete }: LockedFundsTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [completed, setCompleted] = useState(false);
  
  useEffect(() => {
    if (!investment?.tradeInProgress || !investment?.tradeEndTime) return;
    
    const updateTimer = () => {
      const now = Date.now();
      const endTime = new Date(investment.tradeEndTime).getTime();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setCompleted(true);
        onTradeComplete?.();
        return;
      }
      
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remaining / (1000 * 60)) % 60);
      const seconds = Math.floor((remaining / 1000) % 60);
      
      setTimeRemaining({ days, hours, minutes, seconds });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [investment?.tradeInProgress, investment?.tradeEndTime, onTradeComplete]);
  
  if (!investment?.tradeInProgress || !timeRemaining) {
    return null;
  }
  
  const expectedProfit = (investment?.lockedAmount * (investment?.dailyReturnPercent || 10)) / 100;
  const progressPercent = 100 - ((timeRemaining.hours * 60 + timeRemaining.minutes + timeRemaining.seconds / 60) / (24 * 60)) * 100;
  
  return (
    <div className="rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/50 p-4 space-y-3">
      {/* Locked Status */}
      <div className="flex items-center gap-2">
        <Lock className="text-amber-600" size={20} />
        <div>
          <p className="text-sm font-semibold text-amber-600">Funds Locked for Trading</p>
          <p className="text-xs text-amber-600/80">
            ${investment?.lockedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} is locked until trade completes
          </p>
        </div>
      </div>
      
      {/* Countdown Timer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={14} />
            Time Remaining
          </p>
          <p className="text-sm font-bold text-foreground">
            {timeRemaining.hours.toString().padStart(2, '0')}:
            {timeRemaining.minutes.toString().padStart(2, '0')}:
            {timeRemaining.seconds.toString().padStart(2, '0')}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-1000"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Expected Profit */}
      <div className="p-3 rounded-lg bg-black/20">
        <p className="text-xs text-muted-foreground mb-1">Expected Profit After Completion</p>
        <p className="text-lg font-bold text-green-500">
          +${expectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          This amount will be added to your balance when the trade completes
        </p>
      </div>
      
      {/* Cannot Withdraw Message */}
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
        <p className="text-xs font-semibold text-red-600">
          Withdrawal Disabled: Your funds are locked and cannot be withdrawn during trading.
        </p>
      </div>
      
      {completed && (
        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
          <p className="text-sm font-semibold text-green-600">
            Trade Complete! Your profit has been added to your balance.
          </p>
        </div>
      )}
    </div>
  );
}
