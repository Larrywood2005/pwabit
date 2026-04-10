import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

interface BalanceInfo {
  totalBalance: number;
  availableBalance: number;
  lockedInTrades: number;
  pendingWithdrawal: number;
  lastUpdated: string;
}

interface UserBalance {
  totalBalance: number;
  availableBalance: number;
  lockedInTrades: number;
  pendingWithdrawal: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
  powaUpBalance: number;
  totalSpentOnPowaUp: number;
  withdrawalLockUntil: string | null;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsTotal: number;
}

interface UseRealTimeBalanceReturn {
  balance: UserBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook to fetch and manage real-time user balance
 * Uses Socket.io for instant updates with polling fallback every 10 seconds
 */
export function useRealTimeBalance(): UseRealTimeBalanceReturn {
  const { user } = useAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch balance with non-negative value guarantee
  const fetchBalance = useCallback(async () => {
    try {
      setError(null);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch('/api/investments/balance/info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        }
      });

      if (!response.ok) {
        // Return default balance on error instead of throwing
        if (response.status === 401) {
          setBalance({
            totalBalance: 0,
            availableBalance: 0,
            lockedInTrades: 0,
            pendingWithdrawal: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            totalEarnings: 0,
            powaUpBalance: 0,
            totalSpentOnPowaUp: 0,
            withdrawalLockUntil: null,
            pendingWithdrawalsCount: 0,
            pendingWithdrawalsTotal: 0,
          });
          return;
        }
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Ensure all balance values are non-negative
      const sanitizedBalance: UserBalance = {
        totalBalance: Math.max(0, data.totalBalance || 0),
        availableBalance: Math.max(0, data.availableBalance || 0),
        lockedInTrades: Math.max(0, data.lockedInTrades || 0),
        pendingWithdrawal: Math.max(0, data.pendingWithdrawal || 0),
        totalDeposited: Math.max(0, data.totalDeposited || 0),
        totalWithdrawn: Math.max(0, data.totalWithdrawn || 0),
        totalEarnings: Math.max(0, data.totalEarnings || 0),
        powaUpBalance: Math.max(0, data.powaUpBalance || 0),
        totalSpentOnPowaUp: Math.max(0, data.totalSpentOnPowaUp || 0),
        withdrawalLockUntil: data.withdrawalLockUntil || null,
        pendingWithdrawalsCount: Math.max(0, data.pendingWithdrawalsCount || 0),
        pendingWithdrawalsTotal: Math.max(0, data.pendingWithdrawalsTotal || 0),
      };

      if (data.breakdown) {
        setBalance({
          ...sanitizedBalance,
          ...data.breakdown
        });
      } else {
        setBalance(sanitizedBalance);
      }
    } catch (err) {
      console.error('[useRealTimeBalance] Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      // Set default balance on error to prevent crashes
      if (!balance) {
        setBalance({
          totalBalance: 0,
          availableBalance: 0,
          lockedInTrades: 0,
          pendingWithdrawal: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalEarnings: 0,
          powaUpBalance: 0,
          totalSpentOnPowaUp: 0,
          withdrawalLockUntil: null,
          pendingWithdrawalsCount: 0,
          pendingWithdrawalsTotal: 0,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [balance]);

  // Setup Socket.io connection for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    try {
      socketRef.current = io(backendUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socketRef.current.on('connect', () => {
        console.log('[useRealTimeBalance] Socket connected');
        setIsConnected(true);
        socketRef.current?.emit('join', user.id);
      });

      socketRef.current.on('disconnect', () => {
        console.log('[useRealTimeBalance] Socket disconnected');
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('[useRealTimeBalance] Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Listen for balance updates - immediately update local state
      socketRef.current.on('balanceUpdated', (data: { totalBalance: number; availableBalance: number }) => {
        console.log('[useRealTimeBalance] Real-time balance update:', data);
        setBalance(prev => prev ? {
          ...prev,
          totalBalance: Math.max(0, data.totalBalance || prev.totalBalance),
          availableBalance: Math.max(0, data.availableBalance || prev.availableBalance),
        } : null);
        // Also refetch to get complete data
        fetchBalance();
      });

      // Listen for new transactions - trigger balance refetch
      socketRef.current.on('newTransaction', () => {
        console.log('[useRealTimeBalance] New transaction received, refetching balance');
        fetchBalance();
      });

    } catch (err) {
      console.error('[useRealTimeBalance] Socket setup error:', err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave', user.id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, fetchBalance]);

  // Initial fetch and polling setup with 10-second intervals as fallback
  useEffect(() => {
    fetchBalance();

    // Poll every 10 seconds as fallback for real-time balance updates
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
    isConnected
  };
}

/**
 * Hook to check if user can withdraw
 */
export function useCanWithdraw(investmentId: string) {
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawInfo, setWithdrawInfo] = useState<any>(null);

  const checkWithdrawal = useCallback(async () => {
    try {
      setError(null);
      
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const response = await fetch(`/api/investments/${investmentId}/can-withdraw`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check withdrawal status');
      }

      const data = await response.json();
      setCanWithdraw(data.canWithdraw);
      setWithdrawInfo(data);
    } catch (err) {
      console.error('[useCanWithdraw] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check withdrawal');
      setCanWithdraw(false);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId]);

  useEffect(() => {
    checkWithdrawal();
    const interval = setInterval(checkWithdrawal, 5000);
    return () => clearInterval(interval);
  }, [checkWithdrawal]);

  return {
    canWithdraw,
    isLoading,
    error,
    withdrawInfo,
    refetch: checkWithdrawal
  };
}

/**
 * Hook to format balance display
 */
export function useFormattedBalance(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0.00';
  }

  return parseFloat(amount.toString()).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
