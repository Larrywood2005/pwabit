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
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      // Fetch from multiple sources to get complete activity history
      const [investments, transactions, activities] = await Promise.all([
        fetch('/api/investments', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/transactions', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/activities', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ]);

      // Convert all data sources to activity format
      const activitiesArray: Activity[] = [];

      // Add investment activities
      (investments.data || []).forEach((inv: any) => {
        activitiesArray.push({
          id: inv._id,
          type: 'investment',
          title: `${inv.cryptoType || 'Investment'} Created`,
          description: `Invested ${formatCurrency(inv.amount)} with ${inv.dailyReturnPercent || 2.5}% daily returns`,
          amount: inv.amount,
          status: inv.status === 'active' ? 'completed' : inv.status,
          date: inv.activatedAt || inv.createdAt || new Date().toISOString()
        });

        // Add return activities
        if (inv.totalReturnsEarned > 0) {
          activitiesArray.push({
            id: `return-${inv._id}`,
            type: 'return',
            title: 'Daily Return Earned',
            description: `Earned ${formatCurrency(inv.totalReturnsEarned)} from investment returns`,
            amount: inv.totalReturnsEarned,
            status: 'completed',
            date: inv.lastReturnDate || inv.updatedAt || new Date().toISOString()
          });
        }

        // Add trade activities
        if (inv.tradeHistory && inv.tradeHistory.length > 0) {
          inv.tradeHistory.forEach((trade: any, idx: number) => {
            activitiesArray.push({
              id: `trade-${inv._id}-${idx}`,
              type: 'trade',
              title: 'Trade Executed',
              description: `Trade profit: ${trade.profitPercentage}%`,
              amount: trade.profitAmount || 0,
              status: trade.status === 'completed' ? 'completed' : 'pending',
              date: trade.endTime || trade.startTime || new Date().toISOString()
            });
          });
        }
      });

      // Add withdrawal, deposit, and referral commission activities
      (transactions.data || []).forEach((trans: any) => {
        if (trans.type === 'withdrawal') {
          activitiesArray.push({
            id: trans._id,
            type: 'withdrawal',
            title: 'Withdrawal Requested',
            description: `Withdrawal of ${formatCurrency(trans.amount)} to wallet`,
            amount: trans.amount,
            status: trans.status,
            date: trans.createdAt || new Date().toISOString()
          });
        } else if (trans.type === 'deposit') {
          activitiesArray.push({
            id: trans._id,
            type: 'deposit',
            title: 'Deposit Received',
            description: `Deposited ${formatCurrency(trans.amount)}`,
            amount: trans.amount,
            status: trans.status,
            date: trans.createdAt || new Date().toISOString()
          });
        } else if (trans.type === 'referral_commission') {
          const tierLabel = trans.details?.tier ? `Tier ${trans.details.tier}` : '';
          const percentLabel = trans.details?.percentage ? ` (${trans.details.percentage}%)` : '';
          activitiesArray.push({
            id: trans._id,
            type: 'referral',
            title: `Referral Commission ${tierLabel}${percentLabel}`,
            description: trans.description || `Earned ${formatCurrency(trans.amount)} from referral`,
            amount: trans.amount,
            status: trans.status === 'completed' ? 'completed' : 'pending',
            date: trans.createdAt || new Date().toISOString()
          });
        }
      });

      // Add activity rewards (daily bonus, games, referrals)
      (activities.data || []).forEach((activity: any) => {
        let activityType: Activity['type'] = 'return';
        
        if (activity.activityType?.includes('daily-login') || activity.type === 'daily-login') {
          activityType = 'daily-login';
        } else if (activity.activityType?.includes('game') || activity.type === 'game') {
          activityType = 'game';
        }

        activitiesArray.push({
          id: activity._id,
          type: activityType,
          title: activity.title || (activityType === 'daily-login' ? 'Daily Login Bonus' : activityType === 'game' ? 'Game Reward' : 'Activity Completed'),
          description: activity.description || `Earned ${formatCurrency(activity.rewardAmount)}`,
          amount: activity.rewardAmount || 0,
          status: activity.status === 'credited' ? 'completed' : 'pending',
          date: activity.creditedAt || activity.completedAt || activity.createdAt || new Date().toISOString()
        });
      });

      // Sort by date descending (newest first)
      activitiesArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(activitiesArray);
    } catch (err: any) {
      console.error('[v0] Error fetching activities:', err);
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
        socketRef.current.on('gameRewardClaimed', (data: any) => {
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
        socketRef.current.on('dailyLoginClaimed', (data: any) => {
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

        // Listen for new transactions
        socketRef.current.on('newTransaction', (transaction: any) => {
          if (mounted) {
            let type: Activity['type'] = 'return';
            let title = 'Transaction';
            let icon = '';

            if (transaction.type === 'withdrawal') {
              type = 'withdrawal';
              title = 'Withdrawal Requested';
            } else if (transaction.type === 'deposit') {
              type = 'deposit';
              title = 'Deposit Received';
            } else if (transaction.type === 'referral_commission') {
              type = 'referral';
              title = 'Referral Commission';
            }

            const newActivity: Activity = {
              id: transaction._id || `txn-${Date.now()}`,
              type,
              title,
              description: transaction.description || `${formatCurrency(transaction.amount)}`,
              amount: transaction.amount,
              status: transaction.status === 'completed' ? 'completed' : 'pending',
              date: new Date().toISOString()
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        });

        // Listen for investment activity
        socketRef.current.on('investmentCreated', (investment: any) => {
          if (mounted) {
            const newActivity: Activity = {
              id: investment._id || `inv-${Date.now()}`,
              type: 'investment',
              title: `${investment.cryptoType || 'Investment'} Created`,
              description: `Invested ${formatCurrency(investment.amount)}`,
              amount: investment.amount,
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
