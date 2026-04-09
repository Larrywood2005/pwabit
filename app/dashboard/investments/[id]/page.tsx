'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Wallet, Calendar, Clock, Play, Pause, AlertCircle } from 'lucide-react';
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
  tradeHistory?: any[];
  tradeInProgress?: boolean;
  lockedAmount?: number;
  tradeEndTime?: string;
}

export default function InvestmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchInvestment = async () => {
      if (!params.id) return;
      
      try {
        setLoading(true);
        setError('');
        const data = await apiClient.getInvestmentDetails(params.id as string);
        setInvestment(data);
      } catch (err: any) {
        console.error('[v0] Error fetching investment:', err);
        setError(err.message || 'Failed to load investment details');
      } finally {
        setLoading(false);
      }
    };

    if (user && params.id) {
      fetchInvestment();
    }
  }, [user, params.id]);

  const handlePauseResume = async () => {
    if (!investment) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const newStatus = investment.status === 'paused' ? 'active' : 'paused';
      
      // Optimistically update the UI
      setInvestment(prev => prev ? { ...prev, status: newStatus } : null);
      setSuccessMessage(`Investment ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      console.error('[v0] Error updating investment:', err);
      setError(err.message || 'Failed to update investment');
      // Revert on error
      setInvestment(prev => prev ? { ...prev, status: investment.status } : null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireUser>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            <p className='mt-4 text-muted-foreground'>Loading investment details...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !investment) {
    return (
      <ProtectedRoute requireUser>
        <div className='space-y-6'>
          <Link href='/dashboard/investments' className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'>
            <ArrowLeft size={18} />
            Back to Investments
          </Link>
          <div className='p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600'>
            <div className='flex items-center gap-2'>
              <AlertCircle size={20} />
              <span>{error || 'Investment not found'}</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireUser>
      <div className='space-y-6'>
        {/* Back Link */}
        <Link href='/dashboard/investments' className='inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'>
          <ArrowLeft size={18} />
          Back to Investments
        </Link>

        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-foreground'>{investment.cryptoType}</h1>
            <p className='text-muted-foreground mt-1'>Investment Details</p>
          </div>
          <div className='flex items-center gap-3'>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              investment.status === 'active'
                ? 'bg-green-500/20 text-green-600'
                : investment.status === 'paused'
                ? 'bg-yellow-500/20 text-yellow-600'
                : investment.status === 'pending'
                ? 'bg-orange-500/20 text-orange-600'
                : 'bg-gray-500/20 text-gray-600'
            }`}>
              {investment.status === 'pending' ? 'Awaiting Activation' : investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm'>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
            {error}
          </div>
        )}

        {/* Main Stats */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-2 mb-2'>
              <Wallet className='text-primary w-4 h-4 md:w-5 md:h-5' />
              <span className='text-xs md:text-sm text-muted-foreground'>Investment Amount</span>
            </div>
            <p className='text-xl md:text-2xl font-bold text-foreground'>
              ${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className='p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-2 mb-2'>
              <TrendingUp className='text-secondary w-4 h-4 md:w-5 md:h-5' />
              <span className='text-xs md:text-sm text-muted-foreground'>Daily Return</span>
            </div>
            <p className='text-xl md:text-2xl font-bold text-primary'>
              {investment.dailyReturnPercent}%
            </p>
          </div>

          <div className='p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-2 mb-2'>
              <Wallet className='text-green-600 w-4 h-4 md:w-5 md:h-5' />
              <span className='text-xs md:text-sm text-muted-foreground'>Total Earnings</span>
            </div>
            <p className='text-xl md:text-2xl font-bold text-green-600'>
              ${investment.totalReturnsEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className='p-4 md:p-6 rounded-lg bg-card border border-border'>
            <div className='flex items-center gap-2 mb-2'>
              <Calendar className='text-accent w-4 h-4 md:w-5 md:h-5' />
              <span className='text-xs md:text-sm text-muted-foreground'>Days Active</span>
            </div>
            <p className='text-xl md:text-2xl font-bold text-foreground'>
              {investment.daysActive || 0}
            </p>
          </div>
        </div>

        {/* Investment Details Card */}
        <div className='rounded-lg bg-card border border-border overflow-hidden'>
          <div className='p-4 md:p-6 border-b border-border'>
            <h2 className='text-lg md:text-xl font-bold text-foreground'>Investment Information</h2>
          </div>
          <div className='p-4 md:p-6 space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex justify-between py-3 border-b border-border'>
                <span className='text-muted-foreground text-sm'>Crypto Type</span>
                <span className='font-semibold text-foreground text-sm'>{investment.cryptoType}</span>
              </div>
              <div className='flex justify-between py-3 border-b border-border'>
                <span className='text-muted-foreground text-sm'>Status</span>
                <span className={`font-semibold text-sm ${
                  investment.status === 'active' ? 'text-green-600' :
                  investment.status === 'paused' ? 'text-yellow-600' :
                  investment.status === 'pending' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                </span>
              </div>
              <div className='flex justify-between py-3 border-b border-border'>
                <span className='text-muted-foreground text-sm'>Activated On</span>
                <span className='font-semibold text-foreground text-sm'>
                  {investment.activatedAt ? new Date(investment.activatedAt).toLocaleDateString() : 'Pending'}
                </span>
              </div>
              <div className='flex justify-between py-3 border-b border-border'>
                <span className='text-muted-foreground text-sm'>Daily Earnings</span>
                <span className='font-semibold text-primary text-sm'>
                  ${(investment.amount * (investment.dailyReturnPercent / 100)).toFixed(2)}/day
                </span>
              </div>
            </div>
            
            {investment.tradeInProgress && (
              <div className='mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                <div className='flex items-center gap-2 mb-2'>
                  <Clock className='text-blue-600' size={18} />
                  <span className='font-semibold text-blue-600'>Trade in Progress</span>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Your funds are currently locked for trading. The trade will complete automatically.
                </p>
                {investment.lockedAmount && (
                  <p className='text-sm mt-2 text-foreground'>
                    Locked Amount: <span className='font-semibold'>${investment.lockedAmount.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {investment.status !== 'completed' && investment.status !== 'pending' && (
          <div className='flex flex-col sm:flex-row gap-4'>
            <button
              onClick={handlePauseResume}
              disabled={actionLoading || investment.tradeInProgress}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                investment.status === 'paused'
                  ? 'bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                  : 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {actionLoading ? (
                'Processing...'
              ) : investment.status === 'paused' ? (
                <>
                  <Play size={18} />
                  Resume Investment
                </>
              ) : (
                <>
                  <Pause size={18} />
                  Pause Investment
                </>
              )}
            </button>
            
            {investment.tradeInProgress && (
              <p className='text-xs text-muted-foreground text-center sm:text-left self-center'>
                Cannot pause while trade is in progress
              </p>
            )}
          </div>
        )}

        {/* Trade History */}
        {investment.tradeHistory && investment.tradeHistory.length > 0 && (
          <div className='rounded-lg bg-card border border-border overflow-hidden'>
            <div className='p-4 md:p-6 border-b border-border'>
              <h2 className='text-lg md:text-xl font-bold text-foreground'>Trade History</h2>
            </div>
            <div className='divide-y divide-border'>
              {investment.tradeHistory.map((trade: any, index: number) => (
                <div key={index} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='font-semibold text-foreground text-sm'>{trade.type || 'Trade'}</p>
                      <p className='text-xs text-muted-foreground'>
                        {trade.date ? new Date(trade.date).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold text-green-600 text-sm'>+${trade.profit?.toFixed(2) || '0.00'}</p>
                      <p className='text-xs text-muted-foreground'>{trade.status || 'Completed'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
