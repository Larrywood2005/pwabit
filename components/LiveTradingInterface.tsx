'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign, Lock, Activity, CheckCircle } from 'lucide-react';
import CandlestickChart from './CandlestickChart';

interface LiveTradingInterfaceProps {
  investment: any;
  isTrading: boolean;
  timeRemaining?: number;
  lockedAmount?: number;
  onCancel?: () => void;
}

export default function LiveTradingInterface({
  investment,
  isTrading = false,
  timeRemaining = 86400,
  lockedAmount = 0,
  onCancel
}: LiveTradingInterfaceProps) {
  const [countdown, setCountdown] = useState(timeRemaining);
  const [currentPrice, setCurrentPrice] = useState(35000);
  const [priceChange, setPriceChange] = useState(0);
  const [estimatedProfit, setEstimatedProfit] = useState(0);

  // Update countdown timer
  useEffect(() => {
    if (!isTrading || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTrading, countdown]);

  // Simulate price movement
  useEffect(() => {
    if (!isTrading) return;

    const priceInterval = setInterval(() => {
      const change = (Math.random() - 0.5) * 200;
      setCurrentPrice(prev => Math.max(30000, prev + change));
      setPriceChange(change);
      
      // Update estimated profit based on daily return
      const dailyReturnPercent = investment?.dailyReturnPercent || 10;
      const profit = (lockedAmount * dailyReturnPercent) / 100;
      setEstimatedProfit(profit);
    }, 2000);

    return () => clearInterval(priceInterval);
  }, [isTrading, lockedAmount, investment?.dailyReturnPercent]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const priceChangePercent = ((currentPrice - 35000) / 35000) * 100;
  const isPositive = priceChangePercent >= 0;

  if (!isTrading) {
    return (
      <div className="p-4 sm:p-6 rounded-lg bg-card border border-border text-center">
        <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-2 sm:mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium text-sm sm:text-base">No active trade</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Place a trade to start live trading</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Trading Status Banner - Mobile First */}
      <div className="p-3 sm:p-4 md:p-6 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-green-500/30 flex-shrink-0">
              <Lock className="text-green-500 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-green-700">Trade in Progress</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-green-600">Funds locked - trading actively</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white transition-colors w-full sm:w-auto"
            >
              Cancel Trade
            </button>
          )}
        </div>
      </div>

      {/* Live Chart - Fully Responsive */}
      {isTrading && (
        <div className="rounded-lg overflow-hidden border border-border w-full">
          <CandlestickChart isTrading={true} animated={true} />
        </div>
      )}

      {/* Live Price & Stats - Mobile First 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1">Current Price</p>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-foreground truncate">
            ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
            {isPositive ? (
              <TrendingUp size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4 text-green-600 flex-shrink-0" />
            ) : (
              <TrendingDown size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4 text-red-600 flex-shrink-0" />
            )}
            <span className={`text-[9px] sm:text-[10px] md:text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1">Locked Amount</p>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-foreground truncate">
            ${lockedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1">Cannot withdraw</p>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1">Est. Profit</p>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-green-600 truncate">
            +${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1">{investment?.dailyReturnPercent || 10}% daily</p>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
            <Clock size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4 text-primary flex-shrink-0" />
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Time Left</p>
          </div>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl font-bold text-foreground font-mono">{formatTime(countdown)}</p>
          <p className="text-[8px] sm:text-[9px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1">Auto-complete</p>
        </div>
      </div>

      {/* Trade Details - Collapsible on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <div className="p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border">
          <h4 className="font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">Trade Summary</h4>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Account Type</span>
              <span className="font-semibold text-foreground">{investment?.packageName || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Initial Amount</span>
              <span className="font-semibold text-foreground">${investment?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Return Rate</span>
              <span className="font-semibold text-primary">{investment?.dailyReturnPercent || 10}%</span>
            </div>
            <div className="border-t border-border pt-2 sm:pt-3 mt-2 sm:mt-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Expected Return</span>
                <span className="font-bold text-green-600">+${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border">
          <h4 className="font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 text-sm sm:text-base">What Happens Next</h4>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary">
                1
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Watch the Trade</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs">Live chart shows market movement</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary">
                2
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Funds Stay Locked</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs">No withdrawals during trading</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={12} className="sm:w-3.5 sm:h-3.5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Auto-Complete</p>
                <p className="text-muted-foreground text-[10px] sm:text-xs">Profit credits automatically</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner - Mobile Optimized */}
      <div className="p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-[10px] sm:text-xs md:text-sm text-amber-700">
          <strong>Note:</strong> Your funds are locked during this trading period. Profit will be automatically credited to your balance once the 24-hour period ends.
        </p>
      </div>
    </div>
  );
}
