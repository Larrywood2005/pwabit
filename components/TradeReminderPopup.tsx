'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

interface TradeReminderPopupProps {
  investments: any[];
  onRemind: (investment: any) => void;
}

export default function TradeReminderPopup({ investments, onRemind }: TradeReminderPopupProps) {
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
    onRemind(investment);
    handleDismiss(investment._id);
  };
  
  if (visibleReminders.size === 0) return null;
  
  const remindersArray = Array.from(visibleReminders).map(id =>
    investments.find(inv => inv._id === id)
  ).filter(Boolean);
  
  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-40">
      {remindersArray.map((investment) => (
        <div
          key={investment._id}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg p-4 max-w-sm text-white"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Time to Trade!</h3>
              <p className="text-sm text-white/90 mb-3">
                Your {investment.packageName} investment is ready for trading. Place your trade to earn {investment.dailyReturnPercent}% returns.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRemindNow(investment)}
                  className="flex-1 px-3 py-1 rounded bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50 transition-colors"
                >
                  Place Trade
                </button>
                <button
                  onClick={() => handleDismiss(investment._id)}
                  className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
