'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Wallet, Calendar, Clock, Play, Pause, AlertCircle, Zap, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LiveTradingInterface from '@/components/LiveTradingInterface';
import EnhancedTradeModal from '@/components/EnhancedTradeModal';

interface Investment {
  _id: string;
  id?: string;
  cryptoType: string;
  amount: number;
  dailyReturnPercent: number;
  totalReturnsEarned: number;
  activatedAt: string;
  status: 'active' | 'pending' | 'completed' | 'paused';
  daysActive: number;
  dailyReturns: number;
  tradeHistory?: any[];
  tradeInProgress?: boolean;
  lockedAmount?: number;
  tradeEndTime?: string;
  tradeStartTime?: string;
}

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [powaUpBalance, setPowaUpBalance] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const fetchInvestment = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        setError('');
        const [data, powaupData] = await Promise.all([
          apiClient.getInvestmentDetails(params.id as string),
          apiClient.getPowaUpBalance()
        ]);
        setInvestment(data);
        setPowaUpBalance(powaupData.powaUpBalance || 0);
        
        // Calculate time remaining if trade is in progress
        if (data.tradeInProgress && data.tradeEndTime) {
          const endTime = new Date(data.tradeEndTime).getTime();
          const now = Date.now();
          setTimeRemaining(Math.max(0, Math.floor((endTime - now) / 1000)));
        }
      } catch (err: any) {
        console.error('[v0] Error fetching investment:', err);
        setError(err.message || 'Failed to load investment details');
      } finally {
        setLoading(false);
      }
    };

    if (user && params.id) {
      fetchInvestment();
    }
  }, [user, params.id]);

  const handlePauseResume = async () => {
    if (!investment) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const newStatus = investment.status === 'paused' ? 'active' : 'paused';
      
      // Optimistically update the UI
      setInvestment(prev => prev ? { ...prev, status: newStatus } : null);
      setSuccessMessage(`Investment ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      console.error('[v0] Error updating investment:', err);
      setError(err.message || 'Failed to update investment');
      // Revert on error
      setInvestment(prev => prev ? { ...prev, status: investment.status } : null);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlaceTrade = async () => {
    if (!investment) return;
    
    try {
      setTradeLoading(true);
      setError('');
      
      await apiClient.placeTrade(investment._id);
      setSuccessMessage('Trade placed successfully! Your funds are now locked.');
      setTradeModalOpen(false);
      
      // Refresh investment data
      const data = await apiClient.getInvestmentDetails(params.id as string);
      setInvestment(data);
      
      // Update PowaUp balance
      const powaupData = await apiClient.getPowaUpBalance();
      setPowaUpBalance(powaupData.powaUpBalance || 0);
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to place trade');
    } finally {
      setTradeLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireUser>
        <div className='flex items-center justify-center min-h-[300px] sm:min-h-[400px]'>
          <div className='text-center'>
            <div className='inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary'></div>
            <p className='mt-3 sm:mt-4 text-muted-foreground text-xs sm:text-sm'>Loading investment details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !investment) {
    return (
      <ProtectedRoute requireUser>
        <div className='space-y-4 sm:space-y-6 px-2 sm:px-0'>
          <Link href='/dashboard/investments' className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm'>
            <ArrowLeft size={16} className='sm:w-[18px] sm:h-[18px]' />
            Back to Investments
          </Link>
          <div className='p-4 sm:p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600'>
            <div className='flex items-center gap-2'>
              <AlertCircle size={18} className='sm:w-5 sm:h-5' />
              <span className='text-sm sm:text-base'>{error || 'Investment not found'}</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireUser>
      <EnhancedTradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        onConfirm={handlePlaceTrade}
        investment={investment}
        loading={tradeLoading}
        powaUpBalance={powaUpBalance}
      />

      <div className='space-y-4 sm:space-y-6 px-2 sm:px-0'>
        {/* Back Link */}
        <Link href='/dashboard/investments' className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm'>
          <ArrowLeft size={16} className='sm:w-[18px] sm:h-[18px]' />
          Back to Investments
        </Link>

        {/* Header - Mobile First */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0'>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate'>{investment.cryptoType}</h1>
            <p className='text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm'>Investment Details</p>
          </div>
          <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
            <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
              investment.status === 'active'
                ? 'bg-green-500/20 text-green-600'
                : investment.status === 'paused'
                ? 'bg-yellow-500/20 text-yellow-600'
                : investment.status === 'pending'
                ? 'bg-orange-500/20 text-orange-600'
                : 'bg-gray-500/20 text-gray-600'
            }`}>
              {investment.status === 'pending' ? 'Awaiting Activation' : investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
            </span>
            {investment.tradeInProgress && (
              <span className='px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-blue-500/20 text-blue-600 flex items-center gap-1.5'>
                <Lock size={12} className='sm:w-3.5 sm:h-3.5' />
                Trading
              </span>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className='p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs sm:text-sm'>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs sm:text-sm'>
            {error}
          </div>
        )}

        {/* Main Stats - Mobile First Grid */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4'>
          <div className='p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2'>
              <Wallet className='text-primary w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' />
              <span className='text-[10px] sm:text-xs md:text-sm text-muted-foreground'>Investment</span>
            </div>
            <p className='text-base sm:text-lg md:text-2xl font-bold text-foreground'>
              ${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className='p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2'>
              <TrendingUp className='text-secondary w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' />
              <span className='text-[10px] sm:text-xs md:text-sm text-muted-foreground'>Daily Return</span>
            </div>
            <p className='text-base sm:text-lg md:text-2xl font-bold text-primary'>
              {investment.dailyReturnPercent}%
            </p>
          </div>

          <div className='p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2'>
              <Wallet className='text-green-600 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' />
              <span className='text-[10px] sm:text-xs md:text-sm text-muted-foreground'>Earnings</span>
            </div>
            <p className='text-base sm:text-lg md:text-2xl font-bold text-green-600'>
              ${investment.totalReturnsEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className='p-3 sm:p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2'>
              <Calendar className='text-accent w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5' />
              <span className='text-[10px] sm:text-xs md:text-sm text-muted-foreground'>Days Active</span>
            </div>
            <p className='text-base sm:text-lg md:text-2xl font-bold text-foreground'>
              {investment.daysActive || 0}
            </p>
          </div>
        </div>

        {/* Live Trading Interface - Shows when trade is in progress */}
        {investment.tradeInProgress && (
          <LiveTradingInterface
            investment={investment}
            isTrading={true}
            timeRemaining={timeRemaining}
            lockedAmount={investment.lockedAmount || investment.amount}
          />
        )}

        {/* Trade Button - When no trade in progress */}
        {investment.status === 'active' && !investment.tradeInProgress && (
          <div className='p-4 sm:p-6 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div className='min-w-0'>
                <h3 className='font-bold text-foreground text-sm sm:text-base md:text-lg'>Ready to Trade</h3>
                <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
                  Place a trade to earn {investment.dailyReturnPercent}% returns on your ${investment.amount.toLocaleString()} investment.
                </p>
                <div className='flex items-center gap-2 mt-2'>
                  <Zap size={14} className='text-purple-500 sm:w-4 sm:h-4' />
                  <span className='text-xs sm:text-sm text-purple-500 font-medium'>Requires 1 PowaUp (You have: {powaUpBalance})</span>
                </div>
              </div>
              <button
                onClick={() => setTradeModalOpen(true)}
                disabled={powaUpBalance < 1}
                className='w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base'
              >
                <TrendingUp size={16} className='sm:w-[18px] sm:h-[18px]' />
                Place Trade
              </button>
            </div>
          </div>
        )}

        {/* Investment Details Card */}
        <div className='rounded-lg bg-card border border-border overflow-hidden'>
          <div className='p-3 sm:p-4 md:p-6 border-b border-border'>
            <h2 className='text-base sm:text-lg md:text-xl font-bold text-foreground'>Investment Information</h2>
          </div>
          <div className='p-3 sm:p-4 md:p-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
              <div className='flex justify-between items-center py-2 sm:py-3 border-b border-border'>
                <span className='text-muted-foreground text-xs sm:text-sm'>Crypto Type</span>
                <span className='font-semibold text-foreground text-xs sm:text-sm truncate ml-2'>{investment.cryptoType}</span>
              </div>
              <div className='flex justify-between items-center py-2 sm:py-3 border-b border-border'>
                <span className='text-muted-foreground text-xs sm:text-sm'>Status</span>
                <span className={`font-semibold text-xs sm:text-sm ${
                  investment.status === 'active' ? 'text-green-600' :
                  investment.status === 'paused' ? 'text-yellow-600' :
                  investment.status === 'pending' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                </span>
              </div>
              <div className='flex justify-between items-center py-2 sm:py-3 border-b border-border'>
                <span className='text-muted-foreground text-xs sm:text-sm'>Activated On</span>
                <span className='font-semibold text-foreground text-xs sm:text-sm'>
                  {investment.activatedAt ? new Date(investment.activatedAt).toLocaleDateString() : 'Pending'}
                </span>
              </div>
              <div className='flex justify-between items-center py-2 sm:py-3 border-b border-border'>
                <span className='text-muted-foreground text-xs sm:text-sm'>Daily Earnings</span>
                <span className='font-semibold text-primary text-xs sm:text-sm'>
                  ${(investment.amount * (investment.dailyReturnPercent / 100)).toFixed(2)}/day
                </span>
              </div>
            </div>
            
            {investment.tradeInProgress && (
              <div className='mt-4 p-3 sm:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                <div className='flex items-center gap-2 mb-2'>
                  <Clock className='text-blue-600 w-4 h-4 sm:w-[18px] sm:h-[18px]' />
                  <span className='font-semibold text-blue-600 text-sm sm:text-base'>Trade in Progress</span>
                </div>
                <p className='text-xs sm:text-sm text-muted-foreground'>
                  Your funds are currently locked for trading. The trade will complete automatically.
                </p>
                {investment.lockedAmount && (
                  <p className='text-xs sm:text-sm mt-2 text-foreground'>
                    Locked Amount: <span className='font-semibold'>${investment.lockedAmount.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {investment.status !== 'completed' && investment.status !== 'pending' && (
          <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
            <button
              onClick={handlePauseResume}
              disabled={actionLoading || investment.tradeInProgress}
              className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                investment.status === 'paused'
                  ? 'bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                  : 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading ? (
                'Processing...'
              ) : investment.status === 'paused' ? (
                <>
                  <Play size={16} className='sm:w-[18px] sm:h-[18px]' />
                  Resume Investment
                </>
              ) : (
                <>
                  <Pause size={16} className='sm:w-[18px] sm:h-[18px]' />
                  Pause Investment
                </>
              )}
            </button>
            
            {investment.tradeInProgress && (
              <p className='text-[10px] sm:text-xs text-muted-foreground text-center sm:text-left self-center'>
                Cannot pause while trade is in progress
              </p>
            )}
          </div>
        )}

        {/* Trade History */}
        {investment.tradeHistory && investment.tradeHistory.length > 0 && (
          <div className='rounded-lg bg-card border border-border overflow-hidden'>
            <div className='p-3 sm:p-4 md:p-6 border-b border-border'>
              <h2 className='text-base sm:text-lg md:text-xl font-bold text-foreground'>Trade History</h2>
            </div>
            <div className='divide-y divide-border'>
              {investment.tradeHistory.map((trade: any, index: number) => (
                <div key={index} className='p-3 sm:p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                  <div className='flex items-center justify-between'>
                    <div className='min-w-0'>
                      <p className='font-semibold text-foreground text-xs sm:text-sm truncate'>{trade.type || 'Trade'}</p>
                      <p className='text-[10px] sm:text-xs text-muted-foreground mt-0.5'>
                        {trade.startTime ? new Date(trade.startTime).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className='text-right flex-shrink-0 ml-2'>
                      <p className='font-semibold text-green-600 text-xs sm:text-sm'>+${trade.profitAmount?.toFixed(2) || '0.00'}</p>
                      <p className='text-[10px] sm:text-xs text-muted-foreground mt-0.5 capitalize'>{trade.status || 'Completed'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
