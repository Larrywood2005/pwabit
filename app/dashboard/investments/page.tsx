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
            dailyReturnPercent: 10,
            totalReturnsEarned: 750,
            activatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            daysActive: 7,
            dailyReturns: 100
          },
          {
            _id: '2',
            cryptoType: 'Ethereum (ETH)',
            amount: 500,
            dailyReturnPercent: 8,
            totalReturnsEarned: 240,
            activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            daysActive: 3,
            dailyReturns: 40
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
      <div className='space-y-8'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>Your Investments</h1>
            <p className='text-muted-foreground mt-2'>Manage and monitor all your active investments</p>
          </div>
          <Link href='/dashboard/investment/new' className='px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2'>
            <Plus size={18} />
            New Investment
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm'>
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='p-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30'>
            <p className='text-sm text-muted-foreground mb-2'>Total Invested</p>
            <p className='text-3xl font-bold text-foreground'>${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className='p-6 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30'>
            <p className='text-sm text-muted-foreground mb-2'>Total Earnings</p>
            <p className='text-3xl font-bold text-foreground'>${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className='p-6 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
            <p className='text-sm text-muted-foreground mb-2'>Active Investments</p>
            <p className='text-3xl font-bold text-foreground'>{activeCount}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-muted-foreground'>Loading investments...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Tabs */}
            <div className='flex gap-2 overflow-x-auto pb-2 -mx-2 px-2'>
              {(['all', 'active', 'pending', 'paused', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filter === tab
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Investments List */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              {filteredInvestments.length > 0 ? (
                <div className='divide-y divide-border'>
                  {filteredInvestments.map((investment) => (
                    <div key={investment._id || investment.id} className='p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                        {/* Investment Info */}
                        <div className='flex-1'>
                          <div className='flex items-center gap-3 mb-3'>
                            <div className='p-2 rounded-lg bg-primary/20'>
                              <TrendingUp className='text-primary' size={20} />
                            </div>
                            <div>
                              <h3 className='font-bold text-foreground text-lg'>{investment.cryptoType}</h3>
                              <p className='text-xs text-muted-foreground capitalize'>
                                {investment.status === 'pending' ? 'Awaiting Activation' : investment.status}
                              </p>
                            </div>
                          </div>

                          {/* Investment Details Grid */}
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-4'>
                            <div>
                              <p className='text-xs text-muted-foreground mb-1'>Investment Amount</p>
                              <p className='font-semibold text-foreground'>${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground mb-1'>Daily Return</p>
                              <p className='font-semibold text-primary'>{investment.dailyReturnPercent}%</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground mb-1'>Total Earnings</p>
                              <p className='font-semibold text-secondary'>${investment.totalReturnsEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className='text-xs text-muted-foreground mb-1'>Days Active</p>
                              <p className='font-semibold text-foreground'>{investment.daysActive || 0} days</p>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className='flex gap-2 md:flex-col'>
                          <Link href={`/dashboard/investments/${investment._id || investment.id}`} className='flex-1 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-semibold transition-all flex items-center justify-center gap-2'>
                            <Eye size={16} />
                            <span className='hidden md:inline'>View</span>
                          </Link>
                          {(investment.status === 'active' || investment.status === 'paused') && (
                            <button 
                              onClick={() => handlePauseInvestment(investment._id || investment.id || '', investment.status)}
                              disabled={investment.tradeInProgress}
                              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                investment.status === 'paused'
                                  ? 'bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                                  : 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500 hover:text-white'
                              }`}
                              title={investment.tradeInProgress ? 'Cannot change status while trade is in progress' : ''}
                            >
                              {investment.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                              <span className='hidden md:inline'>
                                {investment.status === 'paused' ? 'Resume' : 'Pause'}
                              </span>
                            </button>
                          )}
                          {investment.status === 'completed' && (
                            <button onClick={() => handleDeleteInvestment(investment._id || investment.id || '')} className='flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-all flex items-center justify-center gap-2'>
                              <Trash2 size={16} />
                              <span className='hidden md:inline'>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-12 text-center'>
                  <TrendingUp size={48} className='mx-auto text-muted-foreground opacity-50 mb-4' />
                  <p className='text-muted-foreground mb-4'>No investments found</p>
                  <Link href='/dashboard/investment/new' className='inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all flex items-center gap-2'>
                    <Plus size={18} />
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
