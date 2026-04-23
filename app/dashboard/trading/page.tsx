'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Zap, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import EnhancedTradeModal from '@/components/EnhancedTradeModal';
import CandlestickChart from '@/components/CandlestickChart';

// Wrap the trading content in a separate component for Suspense
function TradingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [powaUpBalance, setPowaUpBalance] = useState(30); // Default to 30 (initial free credits)

  // Get investment ID from URL params using client-side navigation
  const [investmentIdFromUrl, setInvestmentIdFromUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setInvestmentIdFromUrl(params.get('id'));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch investments and PowaUp balance separately to handle errors gracefully
        let investmentsList: any[] = [];
        let powaUpCredits = 30; // Default to 30 (initial free credits)

        try {
          const investData = await apiClient.getUserInvestments(1, 50);
          investmentsList = investData?.data || [];
        } catch (investError: any) {
          // Silently handle - investments may not exist yet
        }

        try {
          const powaupData = await apiClient.getPowaUpBalance();
          // Use the balance from API, or default to 30 if undefined
          powaUpCredits = typeof powaupData?.powaUpBalance === 'number' ? powaupData.powaUpBalance : 30;
        } catch (powaupError: any) {
          // Keep default of 30 (initial free credits)
        }

        setInvestments(investmentsList);
        setPowaUpBalance(powaUpCredits);

        // If investment ID was passed in URL, auto-select it and open modal
        if (investmentIdFromUrl && investmentsList.length > 0) {
          const targetInvestment = investmentsList.find((inv: any) => inv._id === investmentIdFromUrl);
          if (targetInvestment && targetInvestment.status === 'active' && !targetInvestment.tradeInProgress) {
            setSelectedInvestment(targetInvestment);
            setTradeModalOpen(true);
          }
        }
      } catch (err: any) {
        setError('Failed to load trading data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    if (user && investmentIdFromUrl !== undefined) {
      fetchData();
    } else if (user && investmentIdFromUrl === null) {
      setLoading(false);
    }
  }, [user, investmentIdFromUrl]);

  const handleOpenTradeModal = (investment: any) => {
    setSelectedInvestment(investment);
    setTradeModalOpen(true);
  };

  const handlePlaceTrade = async () => {
    if (!selectedInvestment) return;
    
    try {
      setTradeLoading(true);
      setError('');
      
      // Check if user has sufficient PowaUp balance
      if (powaUpBalance < 1) {
        setError('Insufficient PowaUp credits to trade. PowaUp is required for bot maintenance. Purchase PowaUp from your dashboard.');
        setTradeLoading(false);
        return;
      }
      
      await apiClient.placeTrade(selectedInvestment._id);
      setSuccessMessage('Trade placed successfully! Your funds are now locked for 24 hours.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh investments and PowaUp balance
      const [investData, powaupData] = await Promise.all([
        apiClient.getUserInvestments(1, 50),
        apiClient.getPowaUpBalance()
      ]);
      setInvestments(investData.data || []);
      setPowaUpBalance(powaupData.powaUpBalance || 0);
      
      // Close modal after success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTradeModalOpen(false);
      setSelectedInvestment(null);
    } catch (err: any) {
      setError(err.message || 'Failed to place trade');
    } finally {
      setTradeLoading(false);
    }
  };

  // Filter investments
  const activeInvestments = investments.filter((inv: any) => inv.status === 'active');
  const tradingInvestments = investments.filter((inv: any) => inv.tradeInProgress);
  const readyToTradeInvestments = activeInvestments.filter((inv: any) => !inv.tradeInProgress);

  return (
    <ProtectedRoute requireUser>
      {selectedInvestment && (
        <EnhancedTradeModal
          isOpen={tradeModalOpen}
          onClose={() => {
            setTradeModalOpen(false);
            setSelectedInvestment(null);
          }}
          onConfirm={handlePlaceTrade}
          investment={selectedInvestment}
          loading={tradeLoading}
          powaUpBalance={powaUpBalance}
        />
      )}

      <div className='w-full min-h-screen space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-6 py-2 sm:py-4'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-4'>
          <Link href='/dashboard' className='p-2 rounded-lg hover:bg-muted transition-colors'>
            <ArrowLeft size={20} className='text-muted-foreground' />
          </Link>
          <div>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2'>
              <TrendingUp className='text-primary' />
              Trading Center
            </h1>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1'>Place and monitor your trades</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs sm:text-sm flex items-start gap-2'>
            <AlertTriangle size={16} className='flex-shrink-0 mt-0.5' />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className='p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs sm:text-sm'>
            {successMessage}
          </div>
        )}

        {/* PowaUp Status */}
        <div className={`p-4 rounded-lg border ${
          powaUpBalance > 0
            ? 'bg-purple-500/10 border-purple-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 rounded-lg bg-purple-500/20'>
                <Zap className='text-purple-500' size={20} />
              </div>
              <div>
                <p className='font-semibold text-foreground'>PowaUp Credits</p>
                <p className='text-xs text-muted-foreground'>Required for bot trading</p>
              </div>
            </div>
            <div className='text-right'>
              <p className={`text-2xl font-bold ${powaUpBalance > 0 ? 'text-purple-500' : 'text-red-500'}`}>
                {powaUpBalance}
              </p>
              <p className='text-xs text-muted-foreground'>Available</p>
            </div>
          </div>
          {powaUpBalance < 1 && (
            <div className='mt-3 pt-3 border-t border-red-500/20'>
              <p className='text-sm text-red-600 font-semibold'>
                Insufficient PowaUp credits. <Link href='/dashboard' className='underline'>Purchase PowaUp from dashboard</Link>
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[300px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground'>Loading trading data...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Active Trades Section */}
            {tradingInvestments.length > 0 && (
              <div className='space-y-4'>
                <h2 className='text-lg sm:text-xl font-bold text-foreground flex items-center gap-2'>
                  <Clock className='text-green-500' />
                  Active Trades ({tradingInvestments.length})
                </h2>
                <div className='rounded-lg border border-border overflow-hidden p-4'>
                  <CandlestickChart isTrading={true} animated={true} />
                </div>
              </div>
            )}

            {/* Ready to Trade Section */}
            <div className='space-y-4'>
              <h2 className='text-lg sm:text-xl font-bold text-foreground'>
                Ready to Trade ({readyToTradeInvestments.length})
              </h2>

              {readyToTradeInvestments.length > 0 ? (
                <div className='flex flex-col gap-3 sm:gap-4'>
                  {readyToTradeInvestments.map((investment: any) => (
                    <div key={investment._id} className='p-3 sm:p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors w-full'>
                      <div className='flex items-start justify-between mb-3 gap-2'>
                        <div className='flex-1 min-w-0'>
                          <h3 className='font-semibold text-foreground text-sm sm:text-base truncate'>{investment.packageName || 'Investment'}</h3>
                          <p className='text-xs text-muted-foreground truncate'>{investment.cryptoType || 'Crypto'}</p>
                        </div>
                        <span className='px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-600 flex-shrink-0'>
                          Active
                        </span>
                      </div>

                      <div className='space-y-2 mb-3'>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-muted-foreground'>Amount</p>
                          <p className='font-bold text-foreground text-sm'>${investment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-muted-foreground'>Daily Return</p>
                          <p className='font-bold text-primary text-sm'>{investment.dailyReturnPercent || 10}%</p>
                        </div>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-muted-foreground'>Expected Profit</p>
                          <p className='font-bold text-green-600 text-sm'>
                            +${((investment.amount * (investment.dailyReturnPercent || 10)) / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-muted-foreground'>Total Earned</p>
                          <p className='font-bold text-secondary text-sm'>${investment.totalReturnsEarned?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenTradeModal(investment)}
                        disabled={powaUpBalance < 1}
                        className='w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                      >
                        <TrendingUp size={18} />
                        Place Trade Now
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-8 rounded-lg bg-card border border-border text-center'>
                  <TrendingUp className='mx-auto text-muted-foreground mb-3' size={40} />
                  <p className='text-muted-foreground mb-2'>No investments ready to trade</p>
                  <p className='text-xs text-muted-foreground mb-4'>
                    {tradingInvestments.length > 0 
                      ? 'Your active trades will complete in 24 hours.'
                      : 'Create an investment to start trading.'}
                  </p>
                  <Link 
                    href='/dashboard/investment/new' 
                    className='inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors'
                  >
                    New Investment
                  </Link>
                </div>
              )}
            </div>

            {/* Live Chart Preview */}
            <div className='space-y-3'>
              <h2 className='text-lg sm:text-xl font-bold text-foreground'>Market Overview</h2>
              <div className='rounded-lg border border-border overflow-hidden p-4'>
                <CandlestickChart isTrading={tradingInvestments.length > 0} animated={true} />
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Main export - Error boundary handled by Next.js
export default function TradingPage() {
  return (
    <ProtectedRoute>
      <div className='w-full min-h-screen flex flex-col px-2 sm:px-4 md:px-6 py-2 sm:py-4 gap-4'>
        <div className='flex items-center gap-4 justify-between'>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2'>
            <TrendingUp className='text-green-500' />
            Trading Center
          </h1>
          <Link href='/dashboard' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors'>
            <ArrowLeft size={20} />
            <span className='hidden sm:inline'>Back</span>
          </Link>
        </div>
        <TradingContent />
      </div>
    </ProtectedRoute>
  );
}
