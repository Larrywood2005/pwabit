'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';

interface TradeReminderPopupProps {
  investments: any[];
  onRemind: (investment: any) => void;
}

export default function TradeReminderPopup({ investments, onRemind }: TradeReminderPopupProps) {
  const router = useRouter();
  const [visibleReminders, setVisibleReminders] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  // Check investments that are ready to trade (every 30 seconds)
  useEffect(() => {
    const checkTradeReadiness = () => {
      const now = Date.now();
      const newReminders = new Set<string>();
      
      investments.forEach(inv => {
        // Skip if already dismissed or not active
        if (dismissed.has(inv._id) || inv.status !== 'active') return;
        
        // Check if trade is in progress
        if (inv.tradeInProgress) return;
        
        // Check if can trade (24h since activation or last trade)
        if (inv.lastTradedAt) {
          const hoursSinceLastTrade = (now - new Date(inv.lastTradedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastTrade >= 24) {
            newReminders.add(inv._id);
          }
        } else if (inv.activatedAt) {
          const hoursSinceActivation = (now - new Date(inv.activatedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceActivation >= 24) {
            newReminders.add(inv._id);
          }
        }
      });
      
      setVisibleReminders(newReminders);
    };
    
    checkTradeReadiness();
    const interval = setInterval(checkTradeReadiness, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [investments, dismissed]);
  
  const handleDismiss = (investmentId: string) => {
    setVisibleReminders(prev => {
      const next = new Set(prev);
      next.delete(investmentId);
      return next;
    });
    
    // Re-add after 5 minutes if still eligible
    setTimeout(() => {
      setDismissed(prev => {
        const next = new Set(prev);
        next.delete(investmentId);
        return next;
      });
    }, 5 * 60 * 1000);
  };
  
  const handleRemindNow = (investment: any) => {
    // Navigate to trading page with investment ID
    router.push(`/dashboard/trading?id=${investment._id}`);
    handleDismiss(investment._id);
  };
  
  if (visibleReminders.size === 0) return null;
  
  const remindersArray = Array.from(visibleReminders).map(id =>
    investments.find(inv => inv._id === id)
  ).filter(Boolean);
  
  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 sm:bottom-24 space-y-2 sm:space-y-3 z-30 w-[calc(100%-1rem)] max-w-sm px-0.5 sm:px-0">
      {remindersArray.map((investment) => (
        <div
          key={investment._id}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg p-3 sm:p-4 text-white"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg flex-shrink-0 mt-0.5">
              <Bell size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base mb-1">Time to Trade!</h3>
              <p className="text-xs sm:text-sm text-white/90 mb-2 sm:mb-3">
                Your {investment.packageName} is ready. Earn {investment.dailyReturnPercent}% returns.
              </p>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => handleRemindNow(investment)}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-white text-orange-600 font-semibold text-xs sm:text-sm hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
                >
                  Trade
                </button>
                <button
                  onClick={() => handleDismiss(investment._id)}
                  className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex-shrink-0 flex items-center justify-center"
                >
                  <X size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
