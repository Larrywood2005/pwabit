'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  investment: any;
  loading?: boolean;
}

export default function TradeModal({
  isOpen,
  onClose,
  onConfirm,
  investment,
  loading = false
}: TradeModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  if (!isOpen) return null;
  
  const handleConfirm = async () => {
    if (!accepted) return;
    
    setConfirming(true);
    try {
      await onConfirm();
      setAccepted(false);
    } catch (error) {
      console.error('[v0] Trade error:', error);
    } finally {
      setConfirming(false);
    }
  };
  
  const expectedProfit = (investment?.amount * (investment?.dailyReturnPercent || 10)) / 100;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header - Mobile Responsive */}
        <div className="sticky top-0 flex items-center justify-between p-3 sm:p-6 border-b border-border bg-card z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground truncate">Place Trade</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">Review and confirm your trade</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X size={18} className="sm:w-5 sm:h-5 text-foreground" />
          </button>
        </div>
        
        {/* Content - Mobile Responsive */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Trade Details - Mobile First Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="p-2.5 sm:p-4 rounded-lg bg-muted">
              <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Investment Amount</p>
              <p className="text-base sm:text-2xl font-bold text-foreground break-words">
                ${investment?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="p-2.5 sm:p-4 rounded-lg bg-muted">
              <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Daily Return Rate</p>
              <p className="text-base sm:text-2xl font-bold text-secondary">{investment?.dailyReturnPercent}%</p>
            </div>
            
            <div className="p-2.5 sm:p-4 rounded-lg bg-muted">
              <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Expected 24h Profit</p>
              <p className="text-base sm:text-2xl font-bold text-green-500 break-words">
                +${expectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="p-2.5 sm:p-4 rounded-lg bg-muted">
              <p className="text-[10px] sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">Lock Duration</p>
              <p className="text-sm sm:text-lg font-bold text-foreground">24 hours</p>
            </div>
          </div>
          
          {/* Trading Risk Disclaimer - Mobile Responsive */}
          <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex gap-2 sm:gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
              <div className="min-w-0">
                <h4 className="font-semibold text-red-600 mb-1.5 sm:mb-2 text-sm sm:text-base">Trading Risk Disclaimer</h4>
                <ul className="text-xs sm:text-sm text-red-600 space-y-1">
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>Cryptocurrency trading involves substantial risk of loss</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>Past performance does not guarantee future results</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>Your investment will be locked for 24 hours</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>No withdrawals during trading period</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>Market volatility may affect returns</span>
                  </li>
                  <li className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>Only proceed if you can afford to lose</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Acceptance Checkbox - Mobile Responsive */}
          <label className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded border-border cursor-pointer mt-0.5 flex-shrink-0"
            />
            <span className="text-xs sm:text-sm text-foreground leading-relaxed">
              I understand the risks and accept the terms. I confirm that ${investment?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be locked for 24 hours.
            </span>
          </label>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-semibold text-sm sm:text-base order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!accepted || confirming || loading}
              className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base order-1 sm:order-2"
            >
              {confirming || loading ? 'Placing Trade...' : 'Place Trade Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
