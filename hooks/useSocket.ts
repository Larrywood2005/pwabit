'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Socket.io types (avoiding import issues)
type Socket = any;

interface BalanceUpdate {
  totalBalance: number;
  availableBalance: number;
  timestamp: Date;
}

interface TransactionUpdate {
  id: string;
  type: string;
  amount: number;
  status: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

interface UseSocketOptions {
  onBalanceUpdate?: (data: BalanceUpdate) => void;
  onNewTransaction?: (data: TransactionUpdate) => void;
  onTransactionUpdated?: (data: { id: string; status: string; updatedAt: Date }) => void;
}

// Check if socket.io is available and backend is configured
const isSocketEnabled = () => {
  // Never enable socket on server-side
  if (typeof window === 'undefined') return false;
  
  // Check if we're in a browser context
  if (typeof document === 'undefined') return false;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Enable socket if we have a valid backend URL configured
  if (!apiUrl) {
    return false;
  }
  
  return true;
};

export const useSocket = (options: UseSocketOptions = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectAttemptedRef = useRef(false);

  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (connectAttemptedRef.current || socketRef.current?.connected) return;
    
    // Skip socket connection if not enabled or not in browser
    if (!isSocketEnabled() || typeof window === 'undefined') {
      return;
    }

    connectAttemptedRef.current = true;

    try {
      // Dynamically import socket.io-client to avoid SSR issues
      const { io } = await import('socket.io-client');
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
      
      if (!backendUrl) {
        connectAttemptedRef.current = false;
        return;
      }
      
      // Properly configured Socket.IO with websocket as primary, polling as fallback
      socketRef.current = io(backendUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        upgrade: true, // Allow upgrade from polling to websocket
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
        forceNew: false,
        withCredentials: true, // Send credentials for CORS
      });

      socketRef.current.on('connect', () => {
        const transportName = socketRef.current?.io.engine?.transport?.name || 'unknown';
        console.log('[Socket.IO] Connected with transport:', transportName);
        setIsConnected(true);
        setConnectionError(null);

        // Join user-specific room
        if (user?.id && socketRef.current) {
          socketRef.current.emit('join', user.id);
          console.log('[Socket.IO] Joined room for user:', user.id);
        }
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('[Socket.IO] Disconnected. Reason:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error: Error) => {
        // Log connection errors but keep trying
        console.warn('[Socket.IO] Connection error:', error.message);
        setConnectionError('Socket connection unavailable - using polling');
        setIsConnected(false);
      });

      socketRef.current.on('error', (error: Error) => {
        console.error('[Socket.IO] Socket error:', error);
        setConnectionError('Socket error - using polling fallback');
      });

      socketRef.current.io.engine.on('upgrade', (transport: any) => {
        console.log('[Socket.IO] Transport upgraded to:', transport.name);
      });

      // Listen for balance updates
      socketRef.current.on('balanceUpdated', (data: BalanceUpdate) => {
        console.log('[Socket.IO] Balance updated:', data);
        options.onBalanceUpdate?.(data);
      });

      // Listen for new transactions
      socketRef.current.on('newTransaction', (data: TransactionUpdate) => {
        console.log('[Socket.IO] New transaction:', data);
        options.onNewTransaction?.(data);
      });

      // Listen for transaction status updates
      socketRef.current.on('transactionUpdated', (data: { id: string; status: string; updatedAt: Date }) => {
        console.log('[Socket.IO] Transaction updated:', data);
        options.onTransactionUpdated?.(data);
      });
    } catch (error: any) {
      console.error('[Socket.IO] Initialization error:', error);
      setConnectionError(error?.message || 'Failed to initialize socket');
      connectAttemptedRef.current = false;
    }
  }, [user?.id, options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      try {
        if (user?.id) {
          socketRef.current.emit('leave', user.id);
        }
        socketRef.current.disconnect();
      } catch (e) {
        console.error('[Socket.IO] Disconnect error:', e);
      }
      socketRef.current = null;
      setIsConnected(false);
      connectAttemptedRef.current = false;
    }
  }, [user?.id]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user?.id && isSocketEnabled()) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  // Re-join room when user changes
  useEffect(() => {
    if (isConnected && user?.id && socketRef.current) {
      try {
        socketRef.current.emit('join', user.id);
      } catch (e) {
        console.error('[Socket.IO] Re-join error:', e);
      }
    }
  }, [isConnected, user?.id]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
  };
};

export default useSocket;
