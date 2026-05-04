'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Copy, Plus, Wallet, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WalletAddressManager from '@/components/WalletAddressManager';

interface WalletBalance {
  currency: string;
  balance: number;
  usdValue: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'return' | 'returns' | 'daily_trade_return' | 'activity_reward' | 'giveaway_sent' | 'giveaway_received' | 'referral_commission' | 'powaup_sent' | 'powaup_received' | 'bonus' | 'gift';
  amount: number;
  currency: string;
  date: string;
  createdAt?: string;
  timestamp?: string;
  status: 'completed' | 'pending' | 'failed' | 'confirmed' | 'processing' | 'cancelled';
  address?: string;
  description?: string;
  withdrawalFee?: number;
  amountToPay?: number;
  completedAt?: string;
  paidOutAt?: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('[v0] Starting wallet fetch...');

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      // Fetch wallet balances from the new balance calculation system
      try {
        const response = await fetch('/api/investments/balance/info', {
          method: 'GET',
          headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const balanceData = await response.json();
          console.log('[v0] Balance data:', balanceData);
          // SINGLE SOURCE OF TRUTH: Display ONLY availableBalance as "Your Available Funds"
          setBalances([
            { 
              currency: 'USD', 
              balance: balanceData.availableBalance || 0, 
              usdValue: balanceData.availableBalance || 0 
            }
          ]);
          
          console.log('[WALLET - SINGLE SOURCE OF TRUTH]', {
            availableBalance: balanceData.availableBalance,
            lockedInTrades: balanceData.lockedInTrades,
            pendingWithdrawal: balanceData.pendingWithdrawal,
            message: 'Displaying availableBalance (funds available to withdraw or use)'
          });
        } else {
          throw new Error('Failed to fetch balance data');
        }
      } catch (balanceErr) {
        console.error('[v0] Error fetching wallet balances:', balanceErr);
        setError('Unable to fetch wallet balance. Please refresh the page.');
      }

      // Fetch wallet transactions - FIXED: Always get latest 6, combined from all types
      try {
        console.log('[v0] Fetching wallet transactions...');
        const txData = await apiClient.getWalletTransactions(1, 6);
        console.log('[v0] Raw transaction API response:', txData);
        
        if (txData && typeof txData === 'object') {
          let transactionsArray = [];
          
          // Check multiple possible response structures
          if (Array.isArray(txData)) {
            transactionsArray = txData;
            console.log('[v0] Response is direct array');
          } else if (txData.data && Array.isArray(txData.data)) {
            transactionsArray = txData.data;
            console.log('[v0] Response has .data array');
          } else if (txData.transactions && Array.isArray(txData.transactions)) {
            transactionsArray = txData.transactions;
            console.log('[v0] Response has .transactions array');
          } else if (txData.history && Array.isArray(txData.history)) {
            transactionsArray = txData.history;
            console.log('[v0] Response has .history array');
          }
          
          console.log('[v0] Transaction array found:', transactionsArray.length, 'items');
          
          if (transactionsArray.length > 0) {
            // Sort by date descending (latest first)
            const sorted = transactionsArray.sort((a: any, b: any) => {
              const dateA = new Date(b.date || b.createdAt || b.timestamp || Date.now()).getTime();
              const dateB = new Date(a.date || a.createdAt || a.timestamp || Date.now()).getTime();
              console.log('[v0] Sorting - A:', dateA, 'B:', dateB);
              return dateA - dateB;
            });
            // Limit to 6 latest
            const limited = sorted.slice(0, 6);
            setTransactions(limited);
            console.log('[v0] ✓ Transactions set:', limited.length, 'items');
          } else {
            console.log('[v0] No transactions in array, setting empty');
            setTransactions([]);
          }
        } else {
          console.log('[v0] Invalid transaction response format:', typeof txData, txData);
          setTransactions([]);
        }
      } catch (txErr) {
        console.error('[v0] Error fetching wallet transactions:', txErr);
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('[v0] General wallet fetch error:', err);
      setError('Some wallet data may not be available, but showing cached data.');
    } finally {
      setLoading(false);
      console.log('[v0] Wallet fetch complete');
    }
  };

  // Real-time Socket.io setup
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    let pollingInterval: NodeJS.Timeout | null = null;

    const setupSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const backendUrl = apiUrl.replace('/api', '');
        
        if (!mounted) return;
        
        socketRef.current = io(backendUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socketRef.current.on('connect', () => {
          if (mounted) {
            setIsConnected(true);
            socketRef.current?.emit('join', user.id);
            // Clear polling when Socket.io connects
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        });

        socketRef.current.on('disconnect', () => {
          if (mounted) {
            setIsConnected(false);
            // Start polling as fallback when Socket.io disconnects
            console.log('[v0] Socket.io disconnected, starting polling fallback...');
            if (!pollingInterval) {
              pollingInterval = setInterval(() => {
                if (mounted) {
                  fetchWalletData();
                }
              }, 5000); // Poll every 5 seconds
            }
          }
        });

        // Listen for new transactions in realtime
        socketRef.current.on('withdrawal-created', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'withdrawal',
              amount: data.amount,
              currency: data.currency || 'USD',
              date: new Date().toISOString(),
              status: 'pending'
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        socketRef.current.on('withdrawal-paid', (data: any) => {
          if (mounted) {
            setTransactions(prev => 
              prev.map(tx => tx.id === data.id ? { ...tx, status: 'completed' as const } : tx)
            );
          }
        });

        socketRef.current.on('deposit-confirmed', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'deposit',
              amount: data.amount,
              currency: data.currency || 'USD',
              date: new Date().toISOString(),
              status: 'completed'
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        socketRef.current.on('powaUp-purchased', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'purchase',
              amount: data.amount,
              currency: 'PowaUp',
              date: new Date().toISOString(),
              status: 'completed'
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        // Listen for game rewards/bonuses
        socketRef.current.on('game-reward-claimed', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'purchase',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed'
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        socketRef.current.on('bonus-claimed', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'deposit',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed'
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        // Listen for ROI returns (daily returns, investment returns)
        socketRef.current.on('roi-paid', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'returns',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed',
              description: `Daily ROI Return - ${data.dailyReturnPercent}%`
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        // Listen for daily trade returns
        socketRef.current.on('daily-trade-return', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'daily_trade_return',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed',
              description: `Daily Trade ROI - Cycle ${data.cycleNumber || 1}`
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        // Listen for giveaway transfers
        socketRef.current.on('giveaway-sent', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'giveaway_sent',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed',
              description: `Sent to ${data.receiverUserCode || 'User'}`
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        socketRef.current.on('giveaway-received', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: 'giveaway_received',
              amount: data.amount,
              currency: 'USD',
              date: new Date().toISOString(),
              status: 'completed',
              description: `Received from ${data.senderUserCode || 'User'}`
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

        // Listen for generic transaction updates (fallback)
        socketRef.current.on('transaction-created', (data: any) => {
          if (mounted) {
            const newTx: Transaction = {
              id: data.id || `tx-${Date.now()}`,
              type: data.type || 'deposit',
              amount: data.amount || 0,
              currency: data.currency || 'USD',
              date: new Date().toISOString(),
              status: data.status || 'completed',
              description: data.description
            };
            setTransactions(prev => [newTx, ...prev.slice(0, 5)]);
          }
        });

      } catch (err) {
        console.error('[v0] Socket connection error:', err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      // Clear polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
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
  }, [user?.id]);

  // Initial fetch only (no polling/auto-refresh)
  useEffect(() => {
    if (user) {
      fetchWalletData();
      // No polling - fetch only on initial load. Users see real-time updates via Socket.io
    }
  }, [user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalBalance = balances.reduce((sum, b) => sum + b.usdValue, 0);

  return (
    <ProtectedRoute requireUser>
      <div className='w-full space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-4'>
        {/* Header */}
        <div className='space-y-1 sm:space-y-2'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Wallet Management</h1>
            {isConnected && (
              <div className='flex items-center gap-1 text-xs text-green-600 flex-shrink-0'>
                <div className='w-2 h-2 bg-green-600 rounded-full animate-pulse'></div>
                <span className='hidden sm:inline'>Live</span>
              </div>
            )}
          </div>
          <p className='text-xs sm:text-sm text-muted-foreground'>Manage your funds and view transaction history</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm flex items-start gap-3'>
            <span className='text-lg mt-0.5'>ℹ️</span>
            <div>
              <p className='font-semibold mb-1'>Wallet Data Status</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground'>Loading wallet...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Total Balance Card */}
            <div className='p-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground'>
              <p className='text-sm opacity-90 mb-2'>Total Balance</p>
              <h2 className='text-4xl font-bold mb-6'>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              <div className='flex gap-4'>
                <Link href='/dashboard/investment/new' className='px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-all flex items-center gap-2'>
                  <Plus size={18} />
                  Add Funds
                </Link>
                <Link href='/dashboard/withdraw' className='px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-all flex items-center gap-2'>
                  <ArrowDownLeft size={18} />
                  Withdraw
                </Link>
              </div>
            </div>

            {/* Crypto Balances */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              <div className='p-6 border-b border-border'>
                <h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
                  <Wallet size={24} className='text-primary' />
                  Your Balances
                </h2>
              </div>

              <div className='divide-y divide-border'>
                {balances.map((balance) => (
                  <div key={balance.currency} className='p-6 hover:bg-muted/50 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-semibold text-foreground'>{balance.currency}</p>
                        <p className='text-sm text-muted-foreground'>${balance.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className='text-right'>
                        <p className='font-bold text-foreground'>{balance.balance.toLocaleString('en-US', { minimumFractionDigits: 8 })}</p>
                        <p className='text-xs text-muted-foreground'>{balance.currency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History - FIXED: Latest 6 transactions */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              <div className='p-6 border-b border-border flex items-center justify-between'>
                <h2 className='text-xl font-bold text-foreground'>Recent Transactions</h2>
                <span className='text-xs text-muted-foreground'>Latest 6</span>
              </div>

              {transactions.length > 0 ? (
                <div className='divide-y divide-border'>
                  {transactions.map((tx) => {
                    // Determine if transaction is incoming or outgoing
                    const incomingTypes = [
                      'deposit', 
                      'return', 
                      'returns', 
                      'daily_trade_return',
                      'activity_reward',
                      'giveaway_received',
                      'referral_commission',
                      'powaup_received'
                    ];
                    const isIncoming = incomingTypes.includes(tx.type);

                    // Get transaction label
                    const getLabel = (type: string) => {
                      const labels: Record<string, string> = {
                        'deposit': 'Deposit',
                        'withdrawal': 'Withdrawal',
                        'return': 'ROI Return',
                        'returns': 'ROI Return',
                        'daily_trade_return': 'Daily ROI',
                        'activity_reward': 'Activity Reward',
                        'giveaway_sent': 'Giveaway Sent',
                        'giveaway_received': 'Giveaway Received',
                        'referral_commission': 'Referral Commission',
                        'powaup_sent': 'PowaUp Sent',
                        'powaup_received': 'PowaUp Received',
                        'purchase': 'Purchase'
                      };
                      return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
                    };

                    // Get icon and background color based on type
                    const getIconColor = (type: string) => {
                      if (['deposit', 'return', 'returns', 'daily_trade_return', 'activity_reward', 'giveaway_received', 'referral_commission', 'powaup_received'].includes(type)) {
                        return { bg: 'bg-green-500/20', color: 'text-green-600', icon: 'in' };
                      } else if (type === 'purchase' || type === 'powaup_sent') {
                        return { bg: 'bg-blue-500/20', color: 'text-blue-600', icon: 'plus' };
                      } else {
                        return { bg: 'bg-red-500/20', color: 'text-red-600', icon: 'out' };
                      }
                    };

                    const iconInfo = getIconColor(tx.type);

                    return (
                      <div key={tx.id} className='p-6 hover:bg-muted/50 transition-colors'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-4'>
                            <div className={`p-3 rounded-lg ${iconInfo.bg}`}>
                              {iconInfo.icon === 'in' && (
                                <ArrowDownLeft className={iconInfo.color} size={20} />
                              )}
                              {iconInfo.icon === 'plus' && (
                                <Plus className={iconInfo.color} size={20} />
                              )}
                              {iconInfo.icon === 'out' && (
                                <ArrowUpRight className={iconInfo.color} size={20} />
                              )}
                            </div>
                            <div>
                              <p className='font-semibold text-foreground'>{getLabel(tx.type)}</p>
                              <p className='text-xs text-muted-foreground'>
                                {(() => {
                                  const date = new Date(tx.date || tx.createdAt || Date.now());
                                  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                })()}
                              </p>
                              {tx.description && (
                                <p className='text-xs text-muted-foreground mt-1'>{tx.description}</p>
                              )}
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className={`font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                              {isIncoming ? '+' : '-'}${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 capitalize ${
                              tx.status === 'completed' || tx.status === 'confirmed'
                                ? 'bg-green-500/20 text-green-600'
                                : tx.status === 'pending' || tx.status === 'processing'
                                ? 'bg-yellow-500/20 text-yellow-600'
                                : 'bg-red-500/20 text-red-600'
                            }`}>
                              {tx.status}
                            </span>
                            {(tx.withdrawalFee ?? 0) > 0 && (
                              <p className='text-xs text-muted-foreground mt-2'>
                                Fee: -${(tx.withdrawalFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className='p-6 text-center'>
                  <p className='text-muted-foreground'>No transactions yet</p>
                </div>
              )}
            </div>

            {/* Wallet Addresses Manager */}
            <WalletAddressManager />

          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
