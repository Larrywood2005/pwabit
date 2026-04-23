'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Socket type (avoiding direct import issues)
type Socket = any;

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

// Check if socket should be enabled
const isSocketEnabled = () => {
  if (typeof window === 'undefined') return false;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return Boolean(apiUrl && apiUrl !== 'http://localhost:5000/api');
};

/**
 * Hook to fetch and manage real-time user balance
 * Uses polling as primary method with optional Socket.io for instant updates
 */
export function useRealTimeBalance(): UseRealTimeBalanceReturn {
  const { user } = useAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const socketInitializedRef = useRef(false);

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
      
      // Ensure all balance values are non-negative - ALWAYS use totalBalance for display
      const sanitizedBalance: UserBalance = {
        totalBalance: Math.max(0, data.totalBalance ?? 0),
        availableBalance: Math.max(0, data.availableBalance ?? 0),
        lockedInTrades: Math.max(0, data.lockedInTrades ?? 0),
        pendingWithdrawal: Math.max(0, data.pendingWithdrawal ?? 0),
        totalDeposited: Math.max(0, data.totalDeposited ?? 0),
        totalWithdrawn: Math.max(0, data.totalWithdrawn ?? 0),
        totalEarnings: Math.max(0, data.totalEarnings ?? 0),
        powaUpBalance: Math.max(0, data.powaUpBalance ?? 0),
        totalSpentOnPowaUp: Math.max(0, data.totalSpentOnPowaUp ?? 0),
        withdrawalLockUntil: data.withdrawalLockUntil || null,
        pendingWithdrawalsCount: Math.max(0, data.pendingWithdrawalsCount ?? 0),
        pendingWithdrawalsTotal: Math.max(0, data.pendingWithdrawalsTotal ?? 0),
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

  // Setup Socket.io connection for real-time updates (optional enhancement)
  useEffect(() => {
    if (!user?.id || !isSocketEnabled() || socketInitializedRef.current) return;

    const setupSocket = async () => {
      try {
        socketInitializedRef.current = true;
        const { io } = await import('socket.io-client');
        
        const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
        
        if (!backendUrl) return;
        
        socketRef.current = io(backendUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
          upgrade: true, // Allow automatic upgrade to websocket
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 5000,
          autoConnect: true,
          forceNew: false,
          withCredentials: true, // Enable credentials for CORS
        });

        socketRef.current.on('connect', () => {
          const transportName = socketRef.current?.io.engine?.transport?.name || 'polling';
          console.log('[useRealTimeBalance] Socket connected with transport:', transportName);
          setIsConnected(true);
          if (socketRef.current) {
            socketRef.current.emit('join', user.id);
          }
        });

        socketRef.current.on('disconnect', (reason: string) => {
          console.log('[useRealTimeBalance] Socket disconnected:', reason);
          setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error: Error) => {
          console.warn('[useRealTimeBalance] Socket connection error:', error.message);
          setIsConnected(false);
          // Keep trying - reconnection is enabled
        });

        socketRef.current.on('error', (error: Error) => {
          console.error('[useRealTimeBalance] Socket error:', error);
        });

        socketRef.current.io.engine.on('upgrade', (transport: any) => {
          console.log('[useRealTimeBalance] Transport upgraded to:', transport.name);
        });

        // Listen for balance updates - immediately update local state with proper null safety
        socketRef.current.on('balanceUpdated', (data: { totalBalance?: number; availableBalance?: number }) => {
          console.log('[useRealTimeBalance] Received balance update via socket:', data);
          setBalance(prev => prev ? {
            ...prev,
            totalBalance: Math.max(0, data.totalBalance ?? prev.totalBalance),
            availableBalance: Math.max(0, data.availableBalance ?? prev.availableBalance),
          } : null);
        });

        // Listen for new transactions - trigger balance refetch
        socketRef.current.on('newTransaction', () => {
          console.log('[useRealTimeBalance] New transaction received via socket');
          fetchBalance();
        });

      } catch (err) {
        console.error('[useRealTimeBalance] Socket setup error:', err);
        socketInitializedRef.current = false;
      }
    };

    setupSocket();

    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave', user.id);
          socketRef.current.disconnect();
        } catch (e) {
          console.error('[useRealTimeBalance] Cleanup error:', e);
        }
        socketRef.current = null;
        socketInitializedRef.current = false;
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
