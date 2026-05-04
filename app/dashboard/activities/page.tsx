'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, TrendingUp, TrendingDown, Plus, Minus, CheckCircle, AlertCircle, Users, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Activity {
  id: string;
  type: 'investment' | 'withdrawal' | 'deposit' | 'trade' | 'return' | 'referral' | 'game' | 'daily-login';
  title: string;
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  icon?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value || 0);
};

export default function ActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'investment' | 'withdrawal' | 'deposit' | 'trade' | 'return' | 'referral' | 'game' | 'daily-login'>('all');
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchActivities = async () => {
    try {
      setError('');
      console.log('[ACTIVITIES] Starting fetch from unified endpoint...');
      
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Single source of truth: Fetch ALL transactions from unified endpoint
      const response = await fetch('/api/wallets/all-transactions?page=1&limit=50', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[ACTIVITIES] Response:', data);
      
      const activitiesArray: Activity[] = (data.data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        title: tx.title,
        description: tx.description,
        amount: tx.amount,
        status: tx.status,
        date: tx.date
      }));

      console.log('[ACTIVITIES] Converted to activities array:', activitiesArray.length, 'items');
      setActivities(activitiesArray);
    } catch (err: any) {
      console.error('[ACTIVITIES] Error fetching activities:', err);
      setError('Failed to load activities. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time Socket.io connection
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    
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
          }
        });

        socketRef.current.on('disconnect', () => {
          if (mounted) setIsConnected(false);
        });

        // Listen for new game reward activity
        socketRef.current.on('game-reward-claimed', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `game-${Date.now()}`,
              type: 'game',
              title: 'Game Reward Earned',
              description: `Earned ${formatCurrency(data.amount || 0.03)} from puzzle game`,
              amount: data.amount || 0.03,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for daily login bonus activity
        socketRef.current.on('daily-login-bonus', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `daily-${Date.now()}`,
              type: 'daily-login',
              title: 'Daily Login Bonus',
              description: `Earned ${formatCurrency(data.amount || 0.03)} daily login bonus`,
              amount: data.amount || 0.03,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for ROI returns
        socketRef.current.on('daily-trade-return', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `roi-${Date.now()}`,
              type: 'return',
              title: 'Daily Trade ROI',
              description: `Daily ROI Return - ${data.dailyReturnPercent || 2.5}%`,
              amount: data.amount || 0,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for withdrawal requests
        socketRef.current.on('withdrawal-created', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `withdrawal-${Date.now()}`,
              type: 'withdrawal',
              title: 'Withdrawal Requested',
              description: `Withdrawal of ${formatCurrency(data.amount)}`,
              amount: data.amount,
              status: 'pending',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for completed deposits
        socketRef.current.on('deposit-confirmed', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `deposit-${Date.now()}`,
              type: 'deposit',
              title: 'Deposit Received',
              description: `Deposited ${formatCurrency(data.amount)}`,
              amount: data.amount,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for referral commissions
        socketRef.current.on('referral-commission', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `referral-${Date.now()}`,
              type: 'referral',
              title: `Referral Commission Tier ${data.tier || 1}`,
              description: `Earned ${formatCurrency(data.amount)} from referral (${data.percentage || 5}%)`,
              amount: data.amount,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for giveaway sent
        socketRef.current.on('giveaway-sent', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `giveaway-sent-${Date.now()}`,
              type: 'referral',
              title: 'Giveaway Sent',
              description: `Sent ${formatCurrency(data.amount)} to ${data.receiverUserCode || 'User'}`,
              amount: data.amount,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for giveaway received
        socketRef.current.on('giveaway-received', (data: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: `giveaway-received-${Date.now()}`,
              type: 'referral',
              title: 'Giveaway Received',
              description: `Received ${formatCurrency(data.amount)} from ${data.senderUserCode || 'User'}`,
              amount: data.amount,
              status: 'completed',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

      } catch (err) {
        console.error('[v0] Socket connection error:', err);
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
  }, [user?.id]);

  // Initial fetch and polling fallback every 15 seconds
  useEffect(() => {
    if (user) {
      fetchActivities();
      // Poll every 15 seconds as fallback
      const interval = setInterval(fetchActivities, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return <TrendingUp className='text-primary' size={20} />;
      case 'withdrawal':
        return <Minus className='text-red-600' size={20} />;
      case 'deposit':
        return <Plus className='text-green-600' size={20} />;
      case 'trade':
        return <TrendingDown className='text-secondary' size={20} />;
      case 'return':
        return <TrendingUp className='text-accent' size={20} />;
      case 'referral':
        return <Users className='text-green-500' size={20} />;
      case 'game':
        return <Gamepad2 className='text-orange-500' size={20} />;
      case 'daily-login':
        return <CheckCircle className='text-blue-500' size={20} />;
      default:
        return <Clock className='text-muted-foreground' size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-600';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-600';
      case 'failed':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-gray-500/20 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'failed':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requireUser>
      <div className='w-full min-h-screen space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6'>
        {/* Header */}
        <div className='space-y-1 sm:space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <h1 className='text-lg sm:text-2xl md:text-3xl font-bold text-foreground truncate'>Activity History</h1>
            {isConnected && (
              <div className='flex items-center gap-1 text-[10px] sm:text-xs text-green-600 flex-shrink-0'>
                <div className='w-2 h-2 bg-green-600 rounded-full animate-pulse'></div>
                <span className='hidden sm:inline'>Live</span>
              </div>
            )}
          </div>
          <p className='text-xs sm:text-sm text-muted-foreground'>View all your account activities and transactions</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-xs sm:text-sm'>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[300px] sm:min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground text-sm'>Loading activities...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Tabs - Mobile scrollable, responsive */}
            <div className='flex gap-1 sm:gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:pb-0'>
              {(['all', 'investment', 'withdrawal', 'deposit', 'trade', 'return', 'referral', 'game', 'daily-login'] as const satisfies readonly ('all' | 'investment' | 'withdrawal' | 'deposit' | 'trade' | 'return' | 'referral' | 'game' | 'daily-login')[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-semibold whitespace-nowrap text-xs sm:text-sm transition-all flex-shrink-0 ${
                    filter === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {tab === 'daily-login' ? 'Daily' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Activities List - Mobile optimized */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              {filteredActivities.length > 0 ? (
                <div className='divide-y divide-border'>
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className='p-2.5 sm:p-3 md:p-4 lg:p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4'>
                        {/* Icon */}
                        <div className='p-2 sm:p-2.5 md:p-3 rounded-lg bg-muted flex-shrink-0'>
                          {getActivityIcon(activity.type)}
                        </div>

                        {/* Content - Responsive layout */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1'>
                            <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base break-words'>{activity.title}</h3>
                            <span className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 w-fit flex-shrink-0 ${getStatusColor(activity.status)}`}>
                              {getStatusIcon(activity.status)}
                              <span className='hidden sm:inline'>{activity.status}</span>
                              <span className='sm:hidden'>{activity.status.charAt(0)}</span>
                            </span>
                          </div>
                          <p className='text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words'>{activity.description}</p>
                        </div>

                        {/* Amount & Time - Right aligned, no overflow */}
                        <div className='text-right flex-shrink-0'>
                          <p className={`font-bold text-sm sm:text-base md:text-lg ${
                            activity.type === 'withdrawal' || activity.type === 'trade'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {activity.type === 'withdrawal' || activity.type === 'trade' ? '-' : '+'}${activity.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className='text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap'>
                            {new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-6 sm:p-8 md:p-12 text-center'>
                  <Clock size={40} className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto text-muted-foreground opacity-50 mb-3 sm:mb-4' />
                  <p className='text-xs sm:text-sm text-muted-foreground'>No activities found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
