'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Zap, Wallet, Activity, TrendingUp, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserStatusAlert } from '@/components/UserStatusAlert';
import TradeReminderPopup from '@/components/TradeReminderPopup';
import TradingHistory from '@/components/TradingHistory';
import LockedFundsDisplay from '@/components/LockedFundsDisplay';
import PuzzleGame from '@/components/PuzzleGame';
import KYCModal from '@/components/KYCModal';
import { RealtimeBalanceCard } from '@/components/RealtimeBalanceCard';
import { useAutoCompleteTradesDaily } from '@/hooks/useAutoCompleteTradesDaily';
import { use24HourRefresh } from '@/hooks/use24HourRefresh';
import EnhancedTradeModal from '@/components/EnhancedTradeModal';
import LiveTradingInterface from '@/components/LiveTradingInterface';
import { GiveawayModal } from '@/components/GiveawayModal';

interface UserStats {
  totalInvested?: number;
  totalEarnings?: number;
  currentBalance?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<UserStats>({});
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [kycStatus, setKycStatus] = useState('not-submitted');
  const [balance, setBalance] = useState(0);
  const [powaUpBalance, setPowaUpBalance] = useState(0);
  const [showPowaUpModal, setShowPowaUpModal] = useState(false);
  const [powaUpAmount, setPowaUpAmount] = useState(10);
  const [powaUpLoading, setPowaUpLoading] = useState(false);
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);

  // Auto-complete trades after 24 hours
  useAutoCompleteTradesDaily(investments);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user data, investments, KYC status, PowaUp balance, and financial summary in parallel
        const [userData, investData, kycData, powaupData, financialSummary] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getUserInvestments(1, 10),
          apiClient.getKYCStatus(),
          apiClient.getPowaUpBalance(),
          apiClient.getFinancialSummary().catch(err => {
            console.warn('[v0] Financial summary fetch failed, using fallback:', err);
            return null;
          })
        ]);

        setBalance(userData.balance || 0);
        setPowaUpBalance(powaupData.powaUpBalance || 0);
        setInvestments(investData.data || []);
        setKycStatus(kycData.status || 'not-submitted');

        // Check if KYC modal should be shown
        if ((userData.balance || 0) > 300 && kycData.status !== 'approved') {
          setShowKYCModal(true);
        }

        // Use financial summary from backend for accurate real-time values
        if (financialSummary) {
          // SINGLE SOURCE OF TRUTH: Display ONLY availableBalance
          setStats({
            totalInvested: financialSummary.totalInvested || 0,
            totalEarnings: financialSummary.totalEarnings || 0,
            currentBalance: financialSummary.availableBalance || 0  // Use ONLY availableBalance
          });
          
          console.log('[DASHBOARD - SINGLE SOURCE OF TRUTH]', {
            availableBalance: financialSummary.availableBalance,
            lockedInTrades: financialSummary.breakdown?.lockedInTrades || 0,
            pendingWithdrawal: financialSummary.breakdown?.pendingWithdrawal || 0,
            totalInvested: financialSummary.totalInvested,
            totalEarnings: financialSummary.totalEarnings,
            message: 'Displaying availableBalance (confirmed withdrawable funds)'
          });
        } else {
          // Fallback if financial summary fails
          const totalInvested = investData.data?.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0) || 0;
          const displayBalance = userData.balance || 0;

          setStats({
            totalInvested,
            totalEarnings: 0,
            currentBalance: displayBalance
          });
        }
      } catch (err: any) {
        console.error('[v0] Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
      // Set up 24-hour auto-refresh ONLY - do not spam API with unnecessary calls
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const refreshInterval = setInterval(() => {
        console.log('[v0] Dashboard 24-hour auto-refresh triggered');
        fetchData();
      }, TWENTY_FOUR_HOURS);
      
      return () => clearInterval(refreshInterval);
    }
  }, [user, language]);

  // No longer needed since we have real-time 30-second refresh in useEffect

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
        setError('Insufficient PowaUp credits to trade. PowaUp is required for bot maintenance. You can purchase PowaUp using your current balance below.');
        setTradeLoading(false);
        // Show PowaUp modal for purchase
        setTimeout(() => {
          setTradeModalOpen(false);
          setShowPowaUpModal(true);
        }, 1500);
        return;
      }
      
      await apiClient.placeTrade(selectedInvestment._id);
      setSuccessMessage('Trade placed successfully! Your funds are now locked for 24 hours.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh investments and PowaUp balance
      const investData = await apiClient.getUserInvestments(1, 10);
      const powaupData = await apiClient.getPowaUpBalance();
      setInvestments(investData.data || []);
      setPowaUpBalance(powaupData.powaUpBalance || 0);
      
      // Keep modal open to show active trade
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTradeModalOpen(false);
      setSelectedInvestment(null);
    } catch (err: any) {
      setError(err.message || 'Failed to place trade');
    } finally {
      setTradeLoading(false);
    }
  };

  const handlePurchasePowaUp = async () => {
    if (powaUpAmount <= 0) {
      setError('Please enter a valid PowaUp amount');
      return;
    }

    try {
      setPowaUpLoading(true);
      setError('');
      const result = await apiClient.purchasePowaUp(powaUpAmount);
      setSuccessMessage(`Successfully purchased ${powaUpAmount} PowaUp for $${(powaUpAmount * 0.30).toFixed(2)}!`);
      setShowPowaUpModal(false);
      setPowaUpAmount(10);
      
      // Refresh PowaUp balance
      const powaupData = await apiClient.getPowaUpBalance();
      setPowaUpBalance(powaupData.powaUpBalance || 0);
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      // Extract the most relevant error message
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to purchase PowaUp';
      console.error('[v0] PowaUp purchase error:', {
        message: errorMessage,
        status: err?.response?.status,
        balance: err?.response?.data?.currentBalance
      });
      setError(errorMessage);
    } finally {
      setPowaUpLoading(false);
    }
  };

  return (
    <ProtectedRoute requireUser>
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
      
      <TradeReminderPopup
        investments={investments}
        onRemind={handleOpenTradeModal}
      />

      {/* KYC Modal */}
      <KYCModal
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        balance={balance}
        onSuccess={() => {
          setKycStatus('pending');
          setShowKYCModal(false);
        }}
      />

      {/* Giveaway Modal */}
      <GiveawayModal
        isOpen={showGiveawayModal}
        onClose={() => setShowGiveawayModal(false)}
        userCode={user?.userCode || ''}
        currentBalance={balance}
        powaUpBalance={powaUpBalance}
        onSuccess={() => {
          // Refresh balance after giveaway
          setBalance(balance - 1); // Will be updated on next fetch
          setSuccessMessage('Giveaway sent successfully!');
          setTimeout(() => setSuccessMessage(''), 5000);
        }}
      />
      
      <div className='w-full max-w-full overflow-x-hidden space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6 pb-24 sm:pb-32 md:pb-16'>
        {/* User Status Alert */}
        <UserStatusAlert user={user} />

        {/* Header - Fully Mobile Responsive */}
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 w-full'>
          <div className='min-w-0 flex-1'>
            <h1 className='text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words line-clamp-2'>
              {t('dashboard.title')}{user?.fullName?.split(' ')[0]}!
            </h1>
            <p className='text-muted-foreground mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base break-words'>{t('dashboard.subtitle')}</p>
          </div>
          <div className='flex gap-2 flex-wrap sm:flex-nowrap'>
            <button
              onClick={() => setShowGiveawayModal(true)}
              className='flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2 sm:py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm font-medium'
              title='Send Giveaway to another user'
            >
              <Gift size={16} className='sm:w-4 sm:h-4' />
              <span className='hidden sm:inline'>Giveaway</span>
              <span className='sm:hidden'>Gift</span>
            </button>
            <button
              onClick={handleLogout}
              className='flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2 sm:py-2 rounded-lg border border-border text-foreground hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 transition-colors flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm font-medium flex-shrink-0'
            >
              <LogOut size={14} className='sm:w-4 sm:h-4' />
              <span className='hidden sm:inline'>Logout</span>
              <span className='sm:hidden'>Logout</span>
            </button>
          </div>
        </div>

        {/* Error Message - Mobile Responsive */}
        {error && (
          <div className='p-2.5 sm:p-3 md:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs sm:text-sm break-words'>
            {error}
          </div>
        )}

        {/* Success Message - Mobile Responsive */}
        {successMessage && (
          <div className='p-2.5 sm:p-3 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs sm:text-sm break-words'>
            {successMessage}
          </div>
        )}

        {/* Locked Funds Display */}
        <LockedFundsDisplay investments={investments} />

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-gray-600'>Loading your dashboard...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Unified Real-time Balance Card */}
            <RealtimeBalanceCard 
              onWithdrawClick={() => router.push('/dashboard/withdraw')}
              onPowaUpClick={() => setShowPowaUpModal(true)}
            />

            {/* PowaUp Purchase Modal */}
            {showPowaUpModal && (
              <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto'>
                <div className='bg-card rounded-lg border border-border w-full max-w-md p-4 md:p-6 my-auto max-h-[90vh] overflow-y-auto'>
                  <div className='flex items-center justify-between mb-4 md:mb-6'>
                    <div className='flex items-center gap-2'>
                      <div className='p-2 md:p-2.5 bg-purple-500/20 rounded-lg'>
                        <Zap className='text-purple-600 w-5 h-5 md:w-6 md:h-6' />
                      </div>
                      <h2 className='text-lg md:text-2xl font-bold text-foreground'>Buy PowaUp</h2>
                    </div>
                    <button
                      onClick={() => {
                        setShowPowaUpModal(false);
                        setPowaUpAmount(10);
                      }}
                      className='text-muted-foreground hover:text-foreground transition-colors'
                    >
                      <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  </div>
                  
                  <div className='mb-4 md:mb-6 p-3 md:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                    <p className='text-xs md:text-sm text-blue-600 font-medium'>
                      <strong>PowaUp</strong> is your trading key. You need at least 1 PowaUp to place trades.
                    </p>
                    <p className='text-xs md:text-sm text-blue-600 mt-2 font-medium'>
                      <strong>Price:</strong> $0.30 per PowaUp
                    </p>
                  </div>

                  <div className='mb-4 md:mb-6'>
                    <label className='block text-xs md:text-sm font-semibold text-foreground mb-2'>
                      How many PowaUp do you want?
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='1000'
                      value={powaUpAmount}
                      onChange={(e) => setPowaUpAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className='w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg border border-border bg-muted text-foreground text-sm md:text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-purple-500/20 transition-all'
                    />
                    <div className='mt-3 p-3 md:p-4 bg-muted rounded-lg'>
                      <p className='text-xs md:text-sm text-muted-foreground mb-1'>Total Cost</p>
                      <p className='text-xl md:text-2xl font-bold text-purple-600'>
                        ${(powaUpAmount * 0.30).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className='flex gap-2 md:gap-3'>
                    <button
                      onClick={() => {
                        setShowPowaUpModal(false);
                        setPowaUpAmount(10);
                      }}
                      className='flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-xs md:text-sm font-semibold'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePurchasePowaUp}
                      disabled={powaUpLoading}
                      className='flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-2'
                    >
                      {powaUpLoading ? (
                        <>
                          <svg className='animate-spin w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                          </svg>
                          Purchasing...
                        </>
                      ) : (
                        <>
                          <Zap className='w-4 h-4' />
                          Purchase Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Investments */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              <div className='p-2 sm:p-3 md:p-4 lg:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2'>
                <h2 className='text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground'>Your Active Investments</h2>
                <Link href='/dashboard/investment/new' className='text-primary hover:text-secondary font-semibold text-xs sm:text-sm whitespace-nowrap'>
                  New Investment
                </Link>
              </div>

              {investments.length > 0 ? (
                <div className='divide-y divide-border overflow-x-auto'>
                  {investments.map((investment: any) => (
                    <div key={investment.id} className='p-2 sm:p-3 md:p-4 lg:p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex items-start sm:items-center justify-between gap-2 mb-2 sm:mb-3 lg:mb-4'>
                        <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>{investment.cryptoType || 'Crypto Investment'}</h3>
                        <span className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] lg:text-xs font-semibold flex-shrink-0 ${
                          investment.status === 'active'
                            ? 'bg-green-500/20 text-green-600'
                            : investment.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : investment.status === 'paused'
                            ? 'bg-orange-500/20 text-orange-600'
                            : 'bg-gray-500/20 text-gray-600'
                        }`}>
                          {investment.status || 'pending'}
                        </span>
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4'>
                        <div className='min-w-0'>
                          <p className='text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground mb-0.5'>Amount</p>
                          <p className='font-semibold text-foreground text-xs sm:text-sm md:text-base break-words'>${investment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground mb-0.5'>Return %</p>
                          <p className='font-semibold text-primary text-xs sm:text-sm md:text-base'>{investment.dailyReturnPercent || 10}%</p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground mb-0.5'>Total Earn</p>
                          <p className='font-semibold text-secondary text-xs sm:text-sm md:text-base break-words'>${investment.totalReturnsEarned?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
                        </div>
                        <div className='hidden sm:block min-w-0'>
                          <p className='text-[10px] lg:text-xs text-muted-foreground mb-0.5'>Activated</p>
                          <p className='font-semibold text-foreground text-xs lg:text-sm'>{investment.activatedAt ? new Date(investment.activatedAt).toLocaleDateString() : 'Pending'}</p>
                        </div>
                        <div className='col-span-2 sm:col-span-1 min-w-0'>
                          {investment.status === 'active' && !investment.tradeInProgress && (
                            <Link
                              href={`/dashboard/trading?id=${investment._id}`}
                              className='w-full px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 rounded text-[8px] sm:text-[10px] lg:text-xs font-semibold bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white transition-all whitespace-nowrap block text-center'
                            >
                              Trade
                            </Link>
                          )}
                          {investment.status === 'active' && investment.tradeInProgress && (
                            <Link
                              href='/dashboard/trading'
                              className='w-full px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 rounded text-[8px] sm:text-[10px] lg:text-xs font-semibold bg-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white transition-all whitespace-nowrap block text-center'
                            >
                              View Trade
                            </Link>
                          )}
                          {investment.status === 'pending' && (
                            <span className='block text-[8px] sm:text-[10px] lg:text-xs text-yellow-600 font-semibold'>Pending...</span>
                          )}
                          {investment.status === 'paused' && (
                            <span className='block text-[8px] sm:text-[10px] lg:text-xs text-orange-600 font-semibold'>Paused</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-3 sm:p-4 md:p-6 text-center'>
                  <p className='text-muted-foreground mb-3 text-xs sm:text-sm'>No active investments yet</p>
                  <Link href='/dashboard/investment/new' className='inline-block px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all text-xs sm:text-sm'>
                    Start Investing Now
                  </Link>
                </div>
              )}
            </div>

            {/* Live Trading Interface for Active Trades */}
            {investments.some((inv: any) => inv.tradeInProgress) && (
              <div className='space-y-2 sm:space-y-3 md:space-y-4'>
                <h2 className='text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground'>Live Trading Monitor</h2>
                {investments
                  .filter((inv: any) => inv.tradeInProgress)
                  .map((investment: any) => (
                    <LiveTradingInterface
                      key={investment._id}
                      investment={investment}
                      isTrading={investment.tradeInProgress}
                      timeRemaining={investment.tradeEndTime ? Math.max(0, Math.floor((new Date(investment.tradeEndTime).getTime() - Date.now()) / 1000)) : 86400}
                      lockedAmount={investment.lockedAmount}
                    />
                  ))
                }
              </div>
            )}

            {/* Trading History */}
            <div className='space-y-2 sm:space-y-3 md:space-y-4'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                <h2 className='text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground'>Trading History</h2>
                <Link href='/dashboard/trading-history' className='text-primary hover:text-secondary font-semibold text-xs sm:text-sm whitespace-nowrap'>
                  View Full History →
                </Link>
              </div>
              <TradingHistory 
                trades={investments.flatMap((inv: any) => inv.tradeHistory || []).slice(0, 5)}
                loading={loading}
              />
            </div>

            {/* Puzzle Game & Daily Rewards */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6'>
              <PuzzleGame 
                onRewardClaimed={(amount) => {
                  setSuccessMessage(`You earned $${amount} from the puzzle game!`);
                  setTimeout(() => setSuccessMessage(''), 5000);
                  setBalance(prev => prev + amount);
                }}
              />
              
              <div className='p-4 md:p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20'>
                <h3 className='text-base md:text-lg font-bold text-foreground mb-3 md:mb-4'>Daily Login Bonus</h3>
                <p className='text-xs md:text-sm text-muted-foreground mb-3 md:mb-4'>
                  Visit every day to claim your $0.03 daily bonus.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const reward = await apiClient.claimDailyLoginReward();
                      const earnedAmount = reward?.reward?.amount || reward?.amount || 0.03;
                      setSuccessMessage(`You earned $${earnedAmount.toFixed(2)} from daily login!`);
                      setTimeout(() => setSuccessMessage(''), 5000);
                      setBalance(prev => prev + earnedAmount);
                    } catch (err: any) {
                      const errorMsg = err instanceof Error ? err.message : (err?.message || 'You have already claimed today');
                      setError(errorMsg);
                      setTimeout(() => setError(''), 5000);
                    }
                  }}
                  className='w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm'
                >
                  Claim Daily Bonus
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 lg:gap-6'>
              {/* Trading - Primary Action */}
              <Link href='/dashboard/trading' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10 transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-green-500/20 flex-shrink-0'>
                    <TrendingUp className='text-green-500 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Trade Now</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Place trades on investments</p>
              </Link>

              <Link href='/dashboard/investment/new' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-primary/20 flex-shrink-0'>
                    <Wallet className='text-primary w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Invest</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Start a new investment</p>
              </Link>

              <Link href='/dashboard/withdraw' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-secondary/20 flex-shrink-0'>
                    <Activity className='text-secondary w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Withdraw</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Withdraw to wallet</p>
              </Link>

              <Link href='/dashboard/referral' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-accent/20 flex-shrink-0'>
                    <TrendingUp className='text-accent w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Referral</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Earn commissions</p>
              </Link>
            </div>
          </>
        )}
      </div>
      
      {/* Trade Reminder Popup */}
      <TradeReminderPopup
        investments={investments}
        onRemind={(investment) => {
          setSelectedInvestment(investment);
          setTradeModalOpen(true);
        }}
      />
    </ProtectedRoute>
  );
}
