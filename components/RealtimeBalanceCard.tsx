'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Wallet, TrendingUp, ArrowDown, Zap, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// Socket type (avoid direct import to prevent SSR issues)
type Socket = any;

interface BalanceData {
  totalBalance: number;
  availableBalance: number;
  lockedInTrades: number;
  pendingWithdrawal: number;
  totalEarnings: number;
  totalInvested: number;
  investmentReturns: number;
  activityEarnings: number;
  puzzleGameBonuses: number;
  referralEarnings: number;
  tradingBonuses: number;
  powaUpBalance: number;
  [key: string]: any;
}

interface RealtimeBalanceCardProps {
  onWithdrawClick?: () => void;
  onPowaUpClick?: () => void;
}

export function RealtimeBalanceCard({ onWithdrawClick, onPowaUpClick }: RealtimeBalanceCardProps) {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchBalanceData = useCallback(async () => {
    if (!user) return;
    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/investments/balance/info', {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure all values are non-negative and use availableBalance for actions
      const sanitizedData: BalanceData = {
        totalBalance: Math.max(0, data.totalBalance ?? 0),
        availableBalance: Math.max(0, data.availableBalance ?? 0),
        lockedInTrades: Math.max(0, data.lockedInTrades ?? 0),
        pendingWithdrawal: Math.max(0, data.pendingWithdrawal ?? 0),
        totalEarnings: Math.max(0, data.totalEarnings ?? 0),
        totalInvested: Math.max(0, data.totalInvested ?? 0),
        investmentReturns: Math.max(0, data.investmentReturns ?? 0),
        activityEarnings: Math.max(0, data.activityEarnings ?? 0),
        puzzleGameBonuses: Math.max(0, data.puzzleGameBonuses ?? 0),
        referralEarnings: Math.max(0, data.referralEarnings ?? 0),
        tradingBonuses: Math.max(0, data.tradingBonuses ?? 0),
        powaUpBalance: Math.max(0, data.powaUpBalance ?? 0),
      };
      
      console.log('[REALTIME BALANCE] - SINGLE SOURCE OF TRUTH availableBalance', {
        availableBalance: sanitizedData.availableBalance,
        totalBalance: sanitizedData.totalBalance,
        lockedInTrades: sanitizedData.lockedInTrades,
        message: 'Use availableBalance for withdrawals and PowaUp purchases'
      });
      
      setBalanceData(sanitizedData);
    } catch (error) {
      console.error('[v0] Failed to fetch balance:', error);
      setBalanceData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchBalanceData();
  };

  // Socket.io connection for real-time updates (optional enhancement)
  useEffect(() => {
    // Skip socket connection if no user or no valid backend URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!user?.id || !apiUrl || apiUrl === 'http://localhost:5000/api') return;

    let mounted = true;
    
    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const backendUrl = apiUrl.replace('/api', '');
        
        if (!mounted || !backendUrl) return;
        
        socketRef.current = io(backendUrl, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 2,
          reconnectionDelay: 3000,
          timeout: 5000,
        });

        socketRef.current.on('connect', () => {
          if (mounted) {
            setIsConnected(true);
            socketRef.current?.emit('join', user.id);
          }
        });

        socketRef.current.on('disconnect', () => {
          if (mounted) setIsConnected(false);
        });

        socketRef.current.on('connect_error', () => {
          if (mounted) setIsConnected(false);
          // Stop reconnection on error
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        });

        // Listen for real-time balance updates - always use totalBalance for display
        socketRef.current.on('balanceUpdated', (data: { totalBalance?: number; availableBalance?: number }) => {
          if (mounted) {
            setBalanceData(prev => prev ? {
              ...prev,
              totalBalance: Math.max(0, data.totalBalance ?? prev.totalBalance),
              availableBalance: Math.max(0, data.availableBalance ?? prev.availableBalance),
            } : null);
          }
        });

        // Listen for new transactions - trigger full refetch
        socketRef.current.on('newTransaction', () => {
          if (mounted) fetchBalanceData();
        });

      } catch (err) {
        // Silently fail - socket is optional
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave', user.id);
          socketRef.current.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        socketRef.current = null;
      }
    };
  }, [user?.id, fetchBalanceData]);

  // Initial fetch and polling fallback - use long interval (1 hour) to avoid API spam
  // Socket.io provides real-time updates, polling is just a fallback
  useEffect(() => {
    fetchBalanceData();
    // Poll every 1 hour as fallback - socket.io is primary update method
    const interval = setInterval(fetchBalanceData, 3600000);
    return () => clearInterval(interval);
  }, [fetchBalanceData]);

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Please login to view your balance</p>
      </div>
    );
  }

  if (loading || !balanceData) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-muted"></div>
          <div className="h-10 w-48 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  const {
    totalBalance = 0,
    availableBalance = 0,
    lockedInTrades = 0,
    pendingWithdrawal = 0,
    totalEarnings = 0,
    totalInvested = 0,
    investmentReturns = 0,
    activityEarnings = 0,
    puzzleGameBonuses = 0,
    referralEarnings = 0,
    tradingBonuses = 0,
    powaUpBalance = 0,
  } = balanceData;

  const formatCurrency = (value: number | null | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Header with Connection Status and Refresh Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">Your Wallet</h2>
          {isConnected ? (
            <div title="Real-time connected" className="flex-shrink-0">
              <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
            </div>
          ) : (
            <div title="Polling mode" className="flex-shrink-0">
              <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Current Balance Card - Shows full portfolio value (invested + earnings + cash) */}
      <div className="rounded-lg border border-border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-3 sm:p-4 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground">Current Balance</p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-blue-600 break-words">{formatCurrency(totalBalance)}</p>
            <p className="mt-1 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
              Invested + Earnings + Cash
            </p>
          </div>
          <div className="flex-shrink-0 p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Balance Cards Grid - Mobile First Responsive */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
        {/* Available Balance Card - What users can withdraw or use for PowaUp */}
        <div className="rounded-lg border border-border bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-2.5 sm:p-3 md:p-4">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Available Balance</p>
              <p className="mt-0.5 sm:mt-1 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-600 break-words leading-tight">{formatCurrency(availableBalance)}</p>
            </div>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
          </div>
          {availableBalance > 0 && (
            <Button
              size="sm"
              className="mt-2 sm:mt-3 w-full text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9"
              onClick={onWithdrawClick}
            >
              <ArrowDown className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Withdraw
            </Button>
          )}
        </div>

        {/* Locked in Trades Card */}
        <div className="rounded-lg border border-border bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 p-2.5 sm:p-3 md:p-4">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Locked</p>
              <p className="mt-0.5 sm:mt-1 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-amber-600 break-words leading-tight">{formatCurrency(lockedInTrades)}</p>
            </div>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-amber-600 flex-shrink-0" />
          </div>
          {lockedInTrades > 0 && (
            <p className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground leading-tight">
              Available after completion
            </p>
          )}
        </div>

        {/* Pending Withdrawal Card */}
        <div className="rounded-lg border border-border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-2.5 sm:p-3 md:p-4">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Pending</p>
              <p className="mt-0.5 sm:mt-1 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-blue-600 break-words leading-tight">{formatCurrency(pendingWithdrawal)}</p>
            </div>
            <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
          </div>
        </div>

        {/* Total Earnings Card - All profit from investments + bonuses */}
        <div className="rounded-lg border border-border bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 p-2.5 sm:p-3 md:p-4">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">Earnings</p>
              <p className="mt-0.5 sm:mt-1 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-emerald-600 break-words leading-tight">{formatCurrency(totalEarnings)}</p>
            </div>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-emerald-600 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Earnings Breakdown - Collapsible on mobile */}
      {totalEarnings > 0 && (
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-3 md:p-4">
          <h3 className="text-[10px] sm:text-xs md:text-sm font-semibold text-foreground mb-2 sm:mb-3">Earnings Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
            {investmentReturns > 0 && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Investment Returns</p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-emerald-600">{formatCurrency(investmentReturns)}</p>
              </div>
            )}
            {puzzleGameBonuses > 0 && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Game Bonus</p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-orange-600">{formatCurrency(puzzleGameBonuses)}</p>
              </div>
            )}
            {referralEarnings > 0 && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800">
                <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Referral Earnings</p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-pink-600">{formatCurrency(referralEarnings)}</p>
              </div>
            )}
            {tradingBonuses > 0 && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Trading Bonus</p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-blue-600">{formatCurrency(tradingBonuses)}</p>
              </div>
            )}
            {activityEarnings > 0 && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Daily Activities</p>
                <p className="text-xs sm:text-sm md:text-base font-semibold text-purple-600">{formatCurrency(activityEarnings)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PowaUp Balance Card - Always visible so users can buy with available balance */}
      <div className="rounded-lg border-2 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-2.5 sm:p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-muted-foreground">PowaUp Balance</p>
            <p className="mt-0.5 sm:mt-1 text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{powaUpBalance} Credits</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onPowaUpClick}
            className="border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3 flex-shrink-0"
          >
            <Zap className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Buy
          </Button>
        </div>
      </div>
    </div>
  );
}
