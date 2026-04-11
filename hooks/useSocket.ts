'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

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

export const useSocket = (options: UseSocketOptions = {}) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      
      socketRef.current = io(backendUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 5000,
        autoConnect: true,
      });

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected:', socketRef.current?.id);
        setIsConnected(true);
        setConnectionError(null);

        // Join user-specific room
        if (user?.id) {
          socketRef.current?.emit('join', user.id);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error: any) => {
        console.error('[Socket] Connection error:', error?.message);
        setConnectionError(error?.message || 'Connection failed');
        setIsConnected(false);
      });

      // Listen for balance updates
      socketRef.current.on('balanceUpdated', (data: BalanceUpdate) => {
        console.log('[Socket] Balance updated:', data);
        options.onBalanceUpdate?.(data);
      });

      // Listen for new transactions
      socketRef.current.on('newTransaction', (data: TransactionUpdate) => {
        console.log('[Socket] New transaction:', data);
        options.onNewTransaction?.(data);
      });

      // Listen for transaction status updates
      socketRef.current.on('transactionUpdated', (data: { id: string; status: string; updatedAt: Date }) => {
        console.log('[Socket] Transaction updated:', data);
        options.onTransactionUpdated?.(data);
      });
    } catch (error: any) {
      console.error('[Socket] Connection setup error:', error?.message);
      setConnectionError(error?.message || 'Failed to initialize socket');
    }
  }, [user?.id, options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      if (user?.id) {
        socketRef.current.emit('leave', user.id);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [user?.id]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  // Re-join room when user changes
  useEffect(() => {
    if (isConnected && user?.id && socketRef.current) {
      socketRef.current.emit('join', user.id);
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
