'use client';

import { useEffect, useState } from 'react';
import { ArrowDownRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Withdrawal {
  _id: string;
  amount: number;
  currency: string;
  walletAddress: string;
  withdrawalStatus: 'pending' | 'processing' | 'completed';
  createdAt: string;
  processedAt?: string;
  paidOutAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
}

export default function WithdrawalHistoryPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        setLoading(true);
        setError('');
        
        // In a real implementation, this would be a user-specific endpoint
        // For now, we'll fetch from user's transactions
        const response = await apiClient.getWalletTransactions(1, 50);
        
        // Filter for withdrawal transactions
        const userWithdrawals = (response.data || [])
          .filter((tx: any) => tx.type === 'withdrawal')
          .map((tx: any) => ({
            _id: tx._id,
            amount: tx.amount,
            currency: tx.currency,
            walletAddress: tx.walletAddress,
            withdrawalStatus: tx.withdrawalStatus || tx.status,
            createdAt: tx.createdAt,
            processedAt: tx.processedAt,
            paidOutAt: tx.paidOutAt,
            paymentMethod: tx.paymentMethod,
            paymentNotes: tx.paymentNotes
          }));
        
        setWithdrawals(userWithdrawals);
      } catch (err: any) {
        console.error('[v0] Error fetching withdrawals:', err);
        setError('Failed to load withdrawal history');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWithdrawals();
      // Refresh every 10 seconds to show real-time updates
      const interval = setInterval(fetchWithdrawals, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const filteredWithdrawals = statusFilter === 'all' 
    ? withdrawals 
    : withdrawals.filter(w => w.withdrawalStatus === statusFilter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className='text-yellow-600' size={20} />;
      case 'processing':
        return <AlertCircle className='text-blue-600' size={20} />;
      case 'completed':
        return <CheckCircle className='text-green-600' size={20} />;
      default:
        return <Clock className='text-gray-600' size={20} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-600' };
      case 'processing':
        return { label: 'Processing', className: 'bg-blue-500/20 text-blue-600' };
      case 'completed':
        return { label: 'Paid Out', className: 'bg-green-500/20 text-green-600' };
      default:
        return { label: 'Unknown', className: 'bg-gray-500/20 text-gray-600' };
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-foreground'>Withdrawal History</h1>
        <p className='text-muted-foreground mt-2'>Track the status of all your withdrawal requests in real-time</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
          {error}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className='flex gap-2 border-b border-border pb-4'>
        {['all', 'pending', 'processing', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {filteredWithdrawals.length > 0 && (
              <span className='ml-2'>({filteredWithdrawals.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            <p className='mt-4 text-muted-foreground'>Loading withdrawal history...</p>
          </div>
        </div>
      ) : filteredWithdrawals.length > 0 ? (
        <div className='space-y-4'>
          {filteredWithdrawals.map((withdrawal) => {
            const status = getStatusLabel(withdrawal.withdrawalStatus);
            return (
              <div
                key={withdrawal._id}
                className='p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-start gap-4 flex-1'>
                    {/* Icon */}
                    <div className='mt-1'>
                      {getStatusIcon(withdrawal.withdrawalStatus)}
                    </div>

                    {/* Content */}
                    <div className='flex-1'>
                      <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-lg font-semibold text-foreground'>
                          Withdrawal Request
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>Amount</p>
                          <p className='font-bold text-lg text-foreground'>
                            ${withdrawal.amount?.toFixed(2)} {withdrawal.currency || 'USD'}
                          </p>
                        </div>

                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>Wallet Address</p>
                          <p className='font-mono text-xs text-foreground break-all'>
                            {withdrawal.walletAddress || 'N/A'}
                          </p>
                        </div>

                        <div>
                          <p className='text-xs text-muted-foreground mb-1'>Requested</p>
                          <p className='text-sm text-foreground'>
                            {new Date(withdrawal.createdAt).toLocaleDateString()} {new Date(withdrawal.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Timeline */}
                      {withdrawal.withdrawalStatus !== 'pending' && (
                        <div className='mt-4 pt-4 border-t border-border'>
                          <p className='text-xs font-semibold text-muted-foreground mb-3'>Status Timeline</p>
                          <div className='flex items-center gap-2 text-xs'>
                            <div className='flex items-center gap-1'>
                              <CheckCircle size={14} className='text-green-600' />
                              <span>Requested</span>
                            </div>
                            <div className='flex-1 h-0.5 bg-muted'></div>
                            
                            {withdrawal.withdrawalStatus === 'processing' || withdrawal.withdrawalStatus === 'completed' ? (
                              <>
                                <div className='flex items-center gap-1'>
                                  <CheckCircle size={14} className={withdrawal.withdrawalStatus === 'completed' ? 'text-green-600' : 'text-blue-600'} />
                                  <span>Processing</span>
                                </div>
                                {withdrawal.withdrawalStatus === 'completed' && (
                                  <>
                                    <div className='flex-1 h-0.5 bg-muted'></div>
                                    <div className='flex items-center gap-1'>
                                      <CheckCircle size={14} className='text-green-600' />
                                      <span>Paid Out</span>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <div className='flex items-center gap-1'>
                                  <div className='w-3.5 h-3.5 rounded-full border-2 border-muted-foreground'></div>
                                  <span>Processing</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Details (if completed) */}
                      {withdrawal.withdrawalStatus === 'completed' && withdrawal.paymentMethod && (
                        <div className='mt-4 pt-4 border-t border-border'>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div>
                              <p className='text-xs text-muted-foreground mb-1'>Payment Method</p>
                              <p className='text-sm text-foreground'>{withdrawal.paymentMethod}</p>
                            </div>
                            {withdrawal.paidOutAt && (
                              <div>
                                <p className='text-xs text-muted-foreground mb-1'>Paid Out On</p>
                                <p className='text-sm text-foreground'>
                                  {new Date(withdrawal.paidOutAt).toLocaleDateString()} {new Date(withdrawal.paidOutAt).toLocaleTimeString()}
                                </p>
                              </div>
                            )}
                          </div>
                          {withdrawal.paymentNotes && (
                            <div className='mt-2'>
                              <p className='text-xs text-muted-foreground mb-1'>Notes</p>
                              <p className='text-sm text-foreground'>{withdrawal.paymentNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='rounded-lg bg-card border border-border p-12 text-center'>
          <ArrowDownRight className='mx-auto text-muted-foreground mb-4' size={32} />
          <h3 className='text-lg font-semibold text-foreground mb-2'>No Withdrawals Yet</h3>
          <p className='text-muted-foreground'>You haven&apos;t requested any withdrawals yet. Start by going to your wallet and requesting a withdrawal.</p>
        </div>
      )}

      {/* Info Box */}
      <div className='rounded-lg bg-blue-500/10 border border-blue-500/20 p-4'>
        <p className='text-sm text-blue-600'>
          <strong>Real-time Updates:</strong> Your withdrawal status updates automatically. 
          The process typically goes from Pending → Processing → Paid Out. You&apos;ll see real-time updates on this page.
        </p>
      </div>
    </div>
  );
}
