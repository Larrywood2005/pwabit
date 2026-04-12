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
  if (typeof window === 'undefined') return false;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  // Only enable socket if we have a valid backend URL configured
  return Boolean(apiUrl && apiUrl !== 'http://localhost:5000/api');
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
    
    // Skip socket connection if not enabled
    if (!isSocketEnabled()) {
      return;
    }

    connectAttemptedRef.current = true;

    try {
      // Dynamically import socket.io-client to avoid SSR issues
      const { io } = await import('socket.io-client');
      
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
      
      if (!backendUrl) {
        return;
      }
      
      socketRef.current = io(backendUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 2,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 10000,
        timeout: 5000,
        autoConnect: true,
        forceNew: false,
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);

        // Join user-specific room
        if (user?.id && socketRef.current) {
          socketRef.current.emit('join', user.id);
        }
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error: any) => {
        // Silently handle connection errors - socket is optional
        setConnectionError(error?.message || 'Connection failed');
        setIsConnected(false);
        // Stop reconnection attempts after first failure to avoid console spam
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      });

      // Listen for balance updates
      socketRef.current.on('balanceUpdated', (data: BalanceUpdate) => {
        options.onBalanceUpdate?.(data);
      });

      // Listen for new transactions
      socketRef.current.on('newTransaction', (data: TransactionUpdate) => {
        options.onNewTransaction?.(data);
      });

      // Listen for transaction status updates
      socketRef.current.on('transactionUpdated', (data: { id: string; status: string; updatedAt: Date }) => {
        options.onTransactionUpdated?.(data);
      });
    } catch (error: any) {
      // Silently fail - socket is optional functionality
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
        // Ignore disconnect errors
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
        // Ignore emit errors
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
