'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign, Lock, Activity } from 'lucide-react';
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
      <div className="p-6 rounded-lg bg-card border border-border text-center">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No active trade</p>
        <p className="text-sm text-muted-foreground mt-1">Place a trade to start live trading</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Trading Status Banner - Mobile Responsive */}
      <div className="p-3 sm:p-4 md:p-6 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-green-500/30 flex-shrink-0">
              <Lock className="text-green-500 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-green-700">Trade in Progress</h3>
              <p className="text-xs sm:text-sm text-green-600">Funds locked for 24 hours</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white transition-colors w-full sm:w-auto"
            >
              Cancel Trade
            </button>
          )}
        </div>
      </div>

      {/* Live Chart - Fully Responsive */}
      <div className="rounded-lg overflow-hidden border border-border w-full">
        <CandlestickChart isTrading={true} animated={true} />
      </div>

      {/* Live Price & Stats - Mobile First Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-1 sm:mb-2">Current Price</p>
          <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground">${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
            {isPositive ? (
              <TrendingUp size={12} className="sm:w-4 sm:h-4 text-green-600" />
            ) : (
              <TrendingDown size={12} className="sm:w-4 sm:h-4 text-red-600" />
            )}
            <span className={`text-[10px] sm:text-xs md:text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-1 sm:mb-2">Locked Amount</p>
          <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground break-words">${lockedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
          <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 sm:mt-2">Cannot withdraw</p>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-1 sm:mb-2">Est. Profit</p>
          <p className="text-base sm:text-lg md:text-2xl font-bold text-green-600">+${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 sm:mt-2">{investment?.dailyReturnPercent || 10}% daily</p>
        </div>

        <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
            <Clock size={12} className="sm:w-4 sm:h-4 text-primary" />
            <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">Time Left</p>
          </div>
          <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground font-mono">{formatTime(countdown)}</p>
          <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 sm:mt-2">Auto-complete</p>
        </div>
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg bg-card border border-border">
          <h4 className="font-semibold text-foreground mb-4">Trade Summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account Type</span>
              <span className="font-semibold text-foreground">{investment?.packageName || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Initial Amount</span>
              <span className="font-semibold text-foreground">${investment?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Return Rate</span>
              <span className="font-semibold text-primary">{investment?.dailyReturnPercent || 10}%</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expected 24h Return</span>
                <span className="font-bold text-green-600">+${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-card border border-border">
          <h4 className="font-semibold text-foreground mb-4">What Happens Next</h4>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground">Watch the Trade</p>
                <p className="text-muted-foreground text-xs">Real-time candlestick chart shows market movement</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground">Funds Remain Locked</p>
                <p className="text-muted-foreground text-xs">You cannot withdraw during the 24-hour trading period</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground">Auto-Complete</p>
                <p className="text-muted-foreground text-xs">After 24 hours, profit automatically credits to balance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-sm text-amber-700">
          <strong>Note:</strong> Your funds are locked during this trading period. The profit shown is based on your current daily return percentage and will be automatically credited to your balance once the 24-hour period ends.
        </p>
      </div>
    </div>
  );
}
