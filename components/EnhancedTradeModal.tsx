'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import AdvancedCandlestickChart from './AdvancedCandlestickChart';

interface EnhancedTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  investment: any;
  loading?: boolean;
  powaUpBalance?: number;
}

export default function EnhancedTradeModal({
  isOpen,
  onClose,
  onConfirm,
  investment,
  loading = false,
  powaUpBalance = 0
}: EnhancedTradeModalProps) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tradingActive, setTradingActive] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(null);
  const [showDeductionNotice, setShowDeductionNotice] = useState(false);
  const [previousPowaUp, setPreviousPowaUp] = useState<number>(powaUpBalance);
  
  useEffect(() => {
    if (isOpen && investment?.tradeInProgress) {
      setTradingActive(true);
    }
  }, [isOpen, investment?.tradeInProgress]);

  // Show deduction notice when PowaUp balance decreases
  useEffect(() => {
    if (powaUpBalance < previousPowaUp) {
      setShowDeductionNotice(true);
      const timer = setTimeout(() => setShowDeductionNotice(false), 3000);
      return () => clearTimeout(timer);
    }
    setPreviousPowaUp(powaUpBalance);
  }, [powaUpBalance, previousPowaUp]);
  
  if (!isOpen) return null;
  
  const handleConfirm = async () => {
    if (!disclaimerAccepted) return;
    
    setConfirming(true);
    try {
      await onConfirm();
      setTradingActive(true);
      setDisclaimerAccepted(false);
    } catch (error) {
      console.error('[v0] Trade error:', error);
    } finally {
      setConfirming(false);
    }
  };
  
  const expectedProfit = (investment?.amount * (investment?.dailyReturnPercent || 10)) / 100;
  const investmentEndTime = investment?.tradeEndTime 
    ? new Date(investment.tradeEndTime).toLocaleTimeString() 
    : 'Unknown';
  
  const riskDisclaimer = [
    {
      title: 'Substantial Risk of Loss',
      description: 'Trading cryptocurrency involves significant risk. You may lose some or all of your investment. Only invest what you can afford to lose completely.'
    },
    {
      title: 'No Guaranteed Returns',
      description: 'Past performance does not guarantee future results. The expected 10% daily return is not guaranteed and market conditions may result in losses.'
    },
    {
      title: 'Funds Will Be Locked for 24 Hours',
      description: 'Once you place a trade, your invested amount will be locked and unavailable for 24 hours. You cannot access these funds during this period.'
    },
    {
      title: 'No Withdrawals During Trading',
      description: 'You will not be able to withdraw funds while your trade is active. This is a mandatory restriction to protect the trading operation.'
    },
    {
      title: 'Market Volatility',
      description: 'Cryptocurrency markets are highly volatile. Price swings can be extreme and unpredictable, affecting your trade outcomes.'
    },
    {
      title: 'Only Proceed If You Understand Risks',
      description: 'By accepting these terms, you confirm that you fully understand the risks involved and are willing to accept potential loss of your investment.'
    }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-slate-700">
        {/* Header - Mobile Responsive */}
        <div className="sticky top-0 flex items-center justify-between p-3 sm:p-6 border-b border-slate-700 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Place Your Trade</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1 line-clamp-1">
              {tradingActive ? 'Trade active - Real-time monitoring' : 'Review and confirm your trade'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={confirming}
            className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
          >
            <X size={20} className="sm:w-6 sm:h-6 text-slate-300" />
          </button>
        </div>
        
        {/* Content - Mobile Responsive */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Candlestick Chart Background - Fully Mobile Responsive */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm md:text-lg font-semibold text-white flex items-center gap-1.5 sm:gap-2">
              <TrendingUp size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
              <span className="truncate">Live Trading Chart</span>
            </h3>
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-800 w-full">
              <div className="w-full">
                <AdvancedCandlestickChart
                  isAnimating={tradingActive}
                />
              </div>
            </div>
          {tradingActive && (
            <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 text-center">
              Real-time updates - 24h trading - Monitoring active
            </p>
          )}
          </div>

          {/* PowaUp Status - Mobile Responsive */}
          {!tradingActive && (
            <div className={`p-3 sm:p-4 rounded-lg border ${
              powaUpBalance > 0
                ? 'bg-purple-500/10 border-purple-500/50'
                : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-semibold ${powaUpBalance > 0 ? 'text-purple-400' : 'text-red-400'}`}>
                    PowaUp Credits
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                    Required for bot trading
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xl sm:text-2xl font-bold ${powaUpBalance > 0 ? 'text-purple-400' : 'text-red-400'}`}>
                    {powaUpBalance}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400">Available</p>
                </div>
              </div>
              {showDeductionNotice && (
                <div className="mt-2 sm:mt-3 p-2 rounded bg-green-500/20 border border-green-500/50 animate-pulse">
                  <p className="text-[10px] sm:text-xs text-green-400 font-semibold">
                    1 PowaUp deducted for trade
                  </p>
                </div>
              )}
              {powaUpBalance < 1 && (
                <p className="text-[10px] sm:text-xs text-red-400 mt-2 sm:mt-3 font-semibold">
                  Insufficient PowaUp. Purchase using your balance.
                </p>
              )}
            </div>
          )}
          
          {/* Trade Details - Mobile Responsive Grid */}
          {!tradingActive && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="p-2.5 sm:p-4 rounded-lg bg-slate-800 border border-slate-700">
                <p className="text-[10px] sm:text-sm text-slate-400 mb-0.5 sm:mb-1">Amount</p>
                <p className="text-sm sm:text-2xl font-bold text-white break-words">${investment?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-2.5 sm:p-4 rounded-lg bg-slate-800 border border-slate-700">
                <p className="text-[10px] sm:text-sm text-slate-400 mb-0.5 sm:mb-1">Daily Return</p>
                <p className="text-sm sm:text-2xl font-bold text-green-400">{investment?.dailyReturnPercent || 10}%</p>
              </div>
              <div className="p-2.5 sm:p-4 rounded-lg bg-slate-800 border border-slate-700">
                <p className="text-[10px] sm:text-sm text-slate-400 mb-0.5 sm:mb-1">Profit</p>
                <p className="text-sm sm:text-2xl font-bold text-blue-400 break-words">${expectedProfit.toFixed(2)}</p>
              </div>
            </div>
          )}
          
          {tradingActive && (
            <div className="p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/50">
              <p className="text-xs sm:text-sm text-green-400 font-semibold flex items-center gap-2">
                <Clock size={14} className="sm:w-4 sm:h-4" />
                Trade completes in ~24 hours
              </p>
              <p className="text-[10px] sm:text-xs text-green-300 mt-1.5 sm:mt-2">
                Funds locked and trading actively. Real-time monitoring active.
              </p>
            </div>
          )}
          
          {/* Risk Disclaimer - Mobile Responsive */}
          {!tradingActive && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="sm:w-5 sm:h-5 text-amber-500" />
                Trading Risk Disclosure
              </h3>
              
              <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-96 overflow-y-auto">
                {riskDisclaimer.map((risk, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedRisk(expandedRisk === idx ? null : idx)}
                      className="w-full p-2.5 sm:p-3 flex items-start justify-between hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-red-500/20 border border-red-500/50">
                            <span className="text-[10px] sm:text-xs font-bold text-red-400">{idx + 1}</span>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-xs sm:text-base truncate">{risk.title}</p>
                          {expandedRisk === idx && (
                            <p className="text-[10px] sm:text-sm text-slate-400 mt-1.5 sm:mt-2">{risk.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 flex-shrink-0 ml-1.5 sm:ml-2 text-sm sm:text-base">
                        {expandedRisk === idx ? '−' : '+'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Acceptance Checkbox - Mobile Responsive */}
              <div className="p-3 sm:p-4 rounded-lg border-2 border-slate-700 bg-slate-800/50">
                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-xs sm:text-base">I understand and accept all risks</p>
                    <p className="text-[10px] sm:text-sm text-slate-400 mt-0.5 sm:mt-1 leading-relaxed">
                      I confirm I have read all risk disclosures and am willing to risk my investment.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Mobile Responsive */}
        <div className="sticky bottom-0 border-t border-slate-700 bg-slate-900/95 backdrop-blur p-3 sm:p-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={confirming}
            className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-slate-300 font-semibold disabled:opacity-50 text-sm sm:text-base order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!disclaimerAccepted || confirming || loading || tradingActive}
            className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base order-1 sm:order-2"
          >
            {confirming || loading ? (
              <>
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="truncate">Processing...</span>
              </>
            ) : tradingActive ? (
              <>
                <Clock size={14} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span className="truncate">Trade in Progress</span>
              </>
            ) : (
              <>
                <DollarSign size={14} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span className="truncate">Place Trade Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
