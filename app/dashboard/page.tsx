'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Zap, Wallet, Activity, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserStatusAlert } from '@/components/UserStatusAlert';
import EnhancedTradeModal from '@/components/EnhancedTradeModal';
import TradeReminderPopup from '@/components/TradeReminderPopup';
import TradingHistory from '@/components/TradingHistory';
import LockedFundsDisplay from '@/components/LockedFundsDisplay';
import LiveTradingInterface from '@/components/LiveTradingInterface';
import PuzzleGame from '@/components/PuzzleGame';
import KYCModal from '@/components/KYCModal';
import { RealtimeBalanceCard } from '@/components/RealtimeBalanceCard';
import { useAutoCompleteTradesDaily } from '@/hooks/useAutoCompleteTradesDaily';
import { use24HourRefresh } from '@/hooks/use24HourRefresh';

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

  // Auto-complete trades after 24 hours
  useAutoCompleteTradesDaily(investments);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user data, investments, KYC status, and PowaUp balance in parallel
        const [userData, investData, kycData, powaupData] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getUserInvestments(1, 10),
          apiClient.getKYCStatus(),
          apiClient.getPowaUpBalance()
        ]);

        setBalance(userData.balance || 0);
        setPowaUpBalance(powaupData.powaUpBalance || 0);
        setInvestments(investData.data || []);
        setKycStatus(kycData.status || 'not-submitted');

        // Check if KYC modal should be shown
        if ((userData.balance || 0) > 300 && kycData.status !== 'approved') {
          setShowKYCModal(true);
        }

        // Calculate stats from investments AND bonuses
        const totalInvested = investData.data?.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0) || 0;
        
        // Total Earnings = Investment Returns + All Bonuses
        // Investment returns from each active investment
        const investmentReturns = investData.data?.reduce((sum: number, inv: any) => {
          // Use totalReturnsEarned if available (actual returned amount)
          if (inv.totalReturnsEarned && inv.totalReturnsEarned > 0) {
            return sum + inv.totalReturnsEarned;
          }
          
          // Calculate returns based on 5% daily return rate
          let daysActive = 0;
          if (inv.activatedAt) {
            daysActive = Math.floor((Date.now() - new Date(inv.activatedAt).getTime()) / (1000 * 60 * 60 * 24));
          }
          
          // 5% daily return = investment amount * 0.05 * days
          const dailyReturnPercent = inv.dailyReturnPercent || 5; // Default to 5% if not set
          const dailyReturnAmount = (inv.amount || 0) * (dailyReturnPercent / 100);
          const calculatedReturns = dailyReturnAmount * Math.max(0, daysActive);
          
          return sum + calculatedReturns;
        }, 0) || 0;
        
        // Total bonuses = puzzle game + trading + referral earnings
        const allBonuses = (userData.puzzleGameBonuses || 0) + (userData.tradingBonuses || 0) + (userData.referralEarnings || 0);
        
        // Total earnings = Investment returns + All bonuses combined (profit + bonuses)
        const totalEarnings = investmentReturns + allBonuses;
        
        // Available Balance = Current Balance + All Earnings (5% daily profit + bonuses)
        // This represents what users can withdraw or use to buy PowaUp
        const availableBalance = (userData.balance || 0) + Math.max(0, totalEarnings);

        setStats({
          totalInvested,
          totalEarnings: Math.max(0, totalEarnings), // Profit (5% daily returns) + bonuses
          currentBalance: availableBalance, // AVAILABLE BALANCE: Balance + All Earnings (can withdraw or use for PowaUp)
        });
        
        console.log('[v0] Dashboard Balance Calculation:', {
          currentBalance: userData.balance,
          totalEarnings: Math.max(0, totalEarnings),
          availableBalance: availableBalance,
          totalInvested: totalInvested
        });
      } catch (err: any) {
        console.error('[v0] Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
      // Also set up 24-hour auto-refresh in addition to initial load
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const refreshInterval = setInterval(() => {
        console.log('[v0] Dashboard 24-hour auto-refresh triggered');
        fetchData();
      }, TWENTY_FOUR_HOURS);
      return () => clearInterval(refreshInterval);
    }
  }, [user, language]);

  // Use 24-hour refresh hook for additional robust refresh mechanism
  use24HourRefresh(
    () => {
      console.log('[v0] 24-hour dashboard refresh from hook');
      if (user) {
        // Refresh all components: balance, activities, investments
        const event = new CustomEvent('dashboardRefresh24Hour');
        window.dispatchEvent(event);
      }
    },
    [user]
  );

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
      setError(err.message || 'Failed to purchase PowaUp');
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
      
      <div className='w-full min-h-screen space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 overflow-x-hidden px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6'>
        {/* User Status Alert */}
        <UserStatusAlert user={user} />

        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3'>
          <div className='min-w-0'>
            <h1 className='text-lg sm:text-2xl md:text-3xl font-bold text-foreground truncate'>{t('dashboard.title')}{user?.fullName?.split(' ')[0]}!</h1>
            <p className='text-muted-foreground mt-0.5 sm:mt-1 md:mt-2 text-xs sm:text-sm md:text-base truncate'>{t('dashboard.subtitle')}</p>
          </div>
          <button
            onClick={handleLogout}
            className='self-start sm:self-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg border border-border text-foreground hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 transition-colors flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap'
          >
            <LogOut size={14} className='sm:w-4 sm:h-4' />
            Logout
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-2 sm:p-3 md:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs sm:text-sm'>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className='p-2 sm:p-3 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs sm:text-sm'>
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
              <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
                <div className='bg-card rounded-t-lg sm:rounded-lg border border-border w-full sm:max-w-md sm:w-full mx-0 sm:mx-4 p-4 md:p-6 max-h-[90vh] overflow-y-auto'>
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
                          {investment.status === 'active' && (
                            <button
                              onClick={() => handleOpenTradeModal(investment)}
                              className='w-full px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 rounded text-[8px] sm:text-[10px] lg:text-xs font-semibold bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white transition-all whitespace-nowrap'
                            >
                              Trade
                            </button>
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
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 lg:gap-6'>
              <Link href='/dashboard/investment/new' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-primary/20 flex-shrink-0'>
                    <Wallet className='text-primary w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Make Investment</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Start a new crypto investment</p>
              </Link>

              <Link href='/dashboard/withdraw' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-secondary/20 flex-shrink-0'>
                    <Activity className='text-secondary w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Withdrawal</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Withdraw earnings to wallet</p>
              </Link>

              <Link href='/dashboard/referral' className='p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 lg:mb-3'>
                  <div className='p-1.5 sm:p-2 lg:p-3 rounded-lg bg-accent/20 flex-shrink-0'>
                    <TrendingUp className='text-accent w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5' />
                  </div>
                  <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>Referral Program</h3>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden sm:block truncate'>Earn commissions by referring</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
