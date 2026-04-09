'use client';

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Plus, Minus, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Activity {
  id: string;
  type: 'investment' | 'withdrawal' | 'deposit' | 'trade' | 'return';
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
  const [filter, setFilter] = useState<'all' | 'investment' | 'withdrawal' | 'trade' | 'return'>('all');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
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

        // Add withdrawal and deposit activities
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
          }
        });

        // Add activity rewards (daily bonus, games, referrals)
        (activities.data || []).forEach((activity: any) => {
          let activityType = 'investment';
          if (activity.activityType?.includes('daily')) activityType = 'return';
          if (activity.activityType?.includes('referral')) activityType = 'return';
          if (activity.activityType?.includes('game')) activityType = 'return';

          activitiesArray.push({
            id: activity._id,
            type: activityType as any,
            title: activity.title || 'Daily Activity Completed',
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

    if (user) {
      fetchActivities();
      // Auto-refresh activities every 10 seconds to show real-time updates
      const refreshInterval = setInterval(fetchActivities, 10000);
      return () => clearInterval(refreshInterval);
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
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Activity History</h1>
          <p className='text-xs sm:text-sm text-muted-foreground'>View all your account activities and transactions</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm'>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground'>Loading activities...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Tabs */}
            <div className='flex gap-1 sm:gap-2 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0'>
              {(['all', 'investment', 'withdrawal', 'trade', 'return'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-semibold whitespace-nowrap text-xs sm:text-sm transition-all ${
                    filter === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Activities List */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              {filteredActivities.length > 0 ? (
                <div className='divide-y divide-border overflow-x-auto'>
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className='p-2.5 sm:p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4'>
                        {/* Icon */}
                        <div className='p-2 sm:p-3 rounded-lg bg-muted flex-shrink-0'>
                          {getActivityIcon(activity.type)}
                        </div>

                        {/* Content */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1'>
                            <h3 className='font-semibold text-foreground text-xs sm:text-sm md:text-base truncate'>{activity.title}</h3>
                            <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 w-fit ${getStatusColor(activity.status)}`}>
                              {getStatusIcon(activity.status)}
                              {activity.status}
                            </span>
                          </div>
                          <p className='text-xs sm:text-sm text-muted-foreground line-clamp-2'>{activity.description}</p>
                        </div>

                        {/* Amount & Time */}
                        <div className='text-right flex-shrink-0 ml-auto sm:ml-0'>
                          <p className={`font-bold text-base sm:text-lg md:text-xl ${
                            activity.type === 'withdrawal' || activity.type === 'trade'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {activity.type === 'withdrawal' || activity.type === 'trade' ? '-' : '+'}${activity.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <p className='text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap'>
                            {new Date(activity.date).toLocaleDateString()} {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-8 sm:p-12 text-center'>
                  <Clock size={40} className='sm:w-12 sm:h-12 mx-auto text-muted-foreground opacity-50 mb-4' />
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
