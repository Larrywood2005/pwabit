'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Plus, Pause, Play, Trash2, Eye, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Investment {
  _id: string;
  id?: string;
  cryptoType: string;
  amount: number;
  dailyReturnPercent: number;
  totalReturnsEarned: number;
  activatedAt: string;
  status: 'active' | 'pending' | 'completed' | 'paused';
  daysActive: number;
  dailyReturns: number;
  tradeInProgress?: boolean;
}

export default function InvestmentsPage() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'paused' | 'completed'>('all');

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        setLoading(true);
        setError('');

        const investData = await apiClient.getUserInvestments(1, 50);
        setInvestments(investData.data || []);
      } catch (err: any) {
        console.error('[v0] Error fetching investments:', err);
        setError(err.message || 'Failed to load investments');
        // Set mock data for demo
        setInvestments([
          {
            _id: '1',
            cryptoType: 'Bitcoin (BTC)',
            amount: 1000,
            dailyReturnPercent: 3.5,
            totalReturnsEarned: 245,
            activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            daysActive: 7,
            dailyReturns: 35
          },
          {
            _id: '2',
            cryptoType: 'Ethereum (ETH)',
            amount: 500,
            dailyReturnPercent: 3.5,
            totalReturnsEarned: 52.5,
            activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            daysActive: 3,
            dailyReturns: 17.5
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const filteredInvestments = filter === 'all'
    ? investments
    : investments.filter(inv => inv.status === filter);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalEarnings = investments.reduce((sum, inv) => sum + inv.totalReturnsEarned, 0);
  const activeCount = investments.filter(inv => inv.status === 'active').length;

  const handlePauseInvestment = async (investmentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
      // Update local state optimistically
      setInvestments(prev =>
        prev.map(inv =>
          (inv._id === investmentId || inv.id === investmentId)
            ? { ...inv, status: newStatus as Investment['status'] }
            : inv
        )
      );
    } catch (err) {
      console.error('[v0] Error toggling investment status:', err);
      // Refresh data on error
      const investData = await apiClient.getUserInvestments(1, 50);
      setInvestments(investData.data || []);
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setInvestments(prev =>
        prev.filter(inv => inv._id !== investmentId && inv.id !== investmentId)
      );
    } catch (err) {
      console.error('[v0] Error deleting investment:', err);
    }
  };

  return (
    <ProtectedRoute requireUser>
      <div className='space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-0'>
        {/* Header - Mobile First */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0'>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>Your Investments</h1>
            <p className='text-muted-foreground mt-1 sm:mt-2 text-xs sm:text-sm md:text-base'>Manage and monitor all your active investments</p>
          </div>
          <Link 
            href='/dashboard/investment/new' 
            className='w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base'
          >
            <Plus size={16} className='sm:w-[18px] sm:h-[18px]' />
            New Investment
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-xs sm:text-sm'>
            {error}
          </div>
        )}

        {/* Summary Cards - Mobile First Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6'>
          <div className='p-4 sm:p-5 md:p-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30'>
            <p className='text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2'>Total Invested</p>
            <p className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className='p-4 sm:p-5 md:p-6 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30'>
            <p className='text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2'>Total Earnings</p>
            <p className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className='p-4 sm:p-5 md:p-6 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
            <p className='text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2'>Active Investments</p>
            <p className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>{activeCount}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[300px] sm:min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary'></div>
              <p className='mt-3 sm:mt-4 text-muted-foreground text-xs sm:text-sm'>Loading investments...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Tabs - Horizontal Scroll on Mobile */}
            <div className='flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide'>
              {(['all', 'active', 'pending', 'paused', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-xs sm:text-sm flex-shrink-0 ${
                    filter === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Investments List - Mobile First Cards */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              {filteredInvestments.length > 0 ? (
                <div className='divide-y divide-border'>
                  {filteredInvestments.map((investment) => (
                    <div key={investment._id || investment.id} className='p-3 sm:p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex flex-col gap-3 sm:gap-4'>
                        {/* Investment Header */}
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex items-center gap-2 sm:gap-3 min-w-0 flex-1'>
                            <div className='p-1.5 sm:p-2 rounded-lg bg-primary/20 flex-shrink-0'>
                              <TrendingUp className='text-primary w-4 h-4 sm:w-5 sm:h-5' />
                            </div>
                            <div className='min-w-0'>
                              <h3 className='font-bold text-foreground text-sm sm:text-base md:text-lg truncate'>{investment.cryptoType}</h3>
                              <p className='text-[10px] sm:text-xs text-muted-foreground capitalize'>
                                {investment.status === 'pending' ? 'Awaiting Activation' : investment.status}
                                {investment.tradeInProgress && (
                                  <span className='ml-1 sm:ml-2 text-blue-500 font-medium'>Trading</span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Status Badge - Mobile */}
                          <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex-shrink-0 ${
                            investment.status === 'active' 
                              ? 'bg-green-500/20 text-green-600' 
                              : investment.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-600'
                              : investment.status === 'paused'
                              ? 'bg-orange-500/20 text-orange-600'
                              : 'bg-gray-500/20 text-gray-600'
                          }`}>
                            {investment.status}
                          </span>
                        </div>

                        {/* Investment Details Grid - Mobile First */}
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4'>
                          <div className='p-2 sm:p-3 bg-muted/50 rounded-lg'>
                            <p className='text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1'>Amount</p>
                            <p className='font-semibold text-foreground text-xs sm:text-sm md:text-base'>${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className='p-2 sm:p-3 bg-muted/50 rounded-lg'>
                            <p className='text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1'>Daily Return</p>
                            <p className='font-semibold text-primary text-xs sm:text-sm md:text-base'>{investment.dailyReturnPercent}%</p>
                          </div>
                          <div className='p-2 sm:p-3 bg-muted/50 rounded-lg'>
                            <p className='text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1'>Earnings</p>
                            <p className='font-semibold text-secondary text-xs sm:text-sm md:text-base'>${investment.totalReturnsEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className='p-2 sm:p-3 bg-muted/50 rounded-lg'>
                            <p className='text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mb-0.5 sm:mb-1'>Days Active</p>
                            <p className='font-semibold text-foreground text-xs sm:text-sm md:text-base'>{investment.daysActive || 0} days</p>
                          </div>
                        </div>

                        {/* Action Buttons - Mobile First */}
                        <div className='flex flex-wrap gap-2'>
                          <Link 
                            href={`/dashboard/investments/${investment._id || investment.id}`} 
                            className='flex-1 min-w-[100px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm'
                          >
                            <Eye size={14} className='sm:w-4 sm:h-4' />
                            View Details
                          </Link>
                          {(investment.status === 'active' || investment.status === 'paused') && (
                            <button 
                              onClick={() => handlePauseInvestment(investment._id || investment.id || '', investment.status)}
                              disabled={investment.tradeInProgress}
                              className={`flex-1 min-w-[100px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm ${
                                investment.status === 'paused'
                                  ? 'bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                                  : 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500 hover:text-white'
                              }`}
                              title={investment.tradeInProgress ? 'Cannot change status while trade is in progress' : ''}
                            >
                              {investment.status === 'paused' ? <Play size={14} className='sm:w-4 sm:h-4' /> : <Pause size={14} className='sm:w-4 sm:h-4' />}
                              {investment.status === 'paused' ? 'Resume' : 'Pause'}
                            </button>
                          )}
                          {investment.status === 'completed' && (
                            <button 
                              onClick={() => handleDeleteInvestment(investment._id || investment.id || '')} 
                              className='flex-1 min-w-[100px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm'
                            >
                              <Trash2 size={14} className='sm:w-4 sm:h-4' />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-8 sm:p-12 text-center'>
                  <TrendingUp size={36} className='sm:w-12 sm:h-12 mx-auto text-muted-foreground opacity-50 mb-3 sm:mb-4' />
                  <p className='text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base'>No investments found</p>
                  <Link 
                    href='/dashboard/investment/new' 
                    className='inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all text-sm sm:text-base'
                  >
                    <Plus size={16} className='sm:w-[18px] sm:h-[18px]' />
                    Create Your First Investment
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
