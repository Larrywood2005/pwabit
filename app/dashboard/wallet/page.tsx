'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, Copy, Plus, Wallet, Building2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WalletBalance {
  currency: string;
  balance: number;
  usdValue: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  address?: string;
}

interface BankAccount {
  _id: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  status: 'active' | 'inactive';
  addedAt: string;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountHolder: '',
    accountNumber: '',
    bankName: ''
  });
  const [submittingBank, setSubmittingBank] = useState(false);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        setError('');

        // Get auth token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        // Fetch wallet balances from the new balance calculation system
        // CRITICAL: Total Balance = Invested Capital + Earnings + Cash (what user owns)
        // Available Balance = What user can withdraw or use for PowaUp purchases
        try {
          const response = await fetch('/api/investments/balance/info', {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const balanceData = await response.json();
            // Map balance data to wallet balances - show TOTAL balance (invested + earnings + cash)
            // This is what users can see as their full portfolio value
            setBalances([
              { 
                currency: 'USD', 
                balance: balanceData.totalBalance || 0, 
                usdValue: balanceData.totalBalance || 0 
              }
            ]);
          } else {
            throw new Error('Failed to fetch balance data');
          }
        } catch (balanceErr) {
          console.error('[v0] Error fetching wallet balances:', balanceErr);
          setError('Unable to fetch wallet balance. Please refresh the page.');
        }

        // Fetch wallet transactions
        try {
          const txData = await apiClient.getWalletTransactions(1, 10);
          if (txData && txData.data && Array.isArray(txData.data)) {
            setTransactions(txData.data);
          } else if (Array.isArray(txData)) {
            setTransactions(txData);
          } else {
            setTransactions([]);
          }
        } catch (txErr) {
          console.error('[v0] Error fetching wallet transactions:', txErr);
          setTransactions([]);
        }

        // Fetch bank accounts
        try {
          const bankAccounts = await apiClient.getAllBankAccounts();
          setBankAccounts(bankAccounts || []);
        } catch (bankErr) {
          console.error('[v0] Error fetching bank accounts:', bankErr);
          setBankAccounts([]);
        }
      } catch (err: any) {
        console.error('[v0] General wallet fetch error:', err);
        setError('Some wallet data may not be available, but showing cached data.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWalletData();
      // Real-time balance sync every 2 hours (7200000ms)
      const refreshInterval = setInterval(fetchWalletData, 7200000);
      return () => clearInterval(refreshInterval);
    }
  }, [user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.accountHolder || !bankForm.accountNumber || !bankForm.bankName) {
      setError('Please fill in all bank account fields');
      return;
    }

    try {
      setSubmittingBank(true);
      setError('');
      
      const response = await apiClient.addWalletAddress({
        walletAddress: bankForm.accountNumber,
        walletType: 'bank_account'
      });

      // Immediately add the new account to state for real-time update
      if (response && response._id) {
        setBankAccounts(prev => [...prev, response]);
      } else {
        // Fallback: refresh bank accounts from server
        const bankAccounts = await apiClient.getAllBankAccounts();
        setBankAccounts(bankAccounts || []);
      }

      // Reset form
      setBankForm({ accountHolder: '', accountNumber: '', bankName: '' });
      setShowAddBank(false);
      
      // Show success message briefly
      console.log('[v0] Bank account added successfully and saved in real-time');
    } catch (err: any) {
      console.error('[v0] Error adding bank account:', err);
      setError(err.message || 'Failed to add bank account. Please try again.');
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    try {
      await apiClient.delete(`/wallet-addresses/${accountId}`);
      setBankAccounts(bankAccounts.filter(acc => acc._id !== accountId));
    } catch (err: any) {
      console.error('[v0] Error deleting bank account:', err);
      setError(err.message || 'Failed to delete bank account');
    }
  };

  const totalBalance = balances.reduce((sum, b) => sum + b.usdValue, 0);

  return (
    <ProtectedRoute requireUser>
      <div className='w-full space-y-4 sm:space-y-6 md:space-y-8 px-2 sm:px-4'>
        {/* Header */}
        <div className='space-y-1 sm:space-y-2'>
          <h1 className='text-2xl sm:text-3xl font-bold text-foreground'>Wallet Management</h1>
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
                <button onClick={() => setShowAddFunds(true)} className='px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-all flex items-center gap-2'>
                  <Plus size={18} />
                  Add Funds
                </button>
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

            {/* Transaction History */}
            <div className='rounded-lg bg-card border border-border overflow-hidden'>
              <div className='p-6 border-b border-border'>
                <h2 className='text-xl font-bold text-foreground'>Recent Transactions</h2>
              </div>

              {transactions.length > 0 ? (
                <div className='divide-y divide-border'>
                  {transactions.map((tx) => (
                    <div key={tx.id} className='p-6 hover:bg-muted/50 transition-colors'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <div className={`p-3 rounded-lg ${
                            tx.type === 'deposit'
                              ? 'bg-green-500/20'
                              : 'bg-red-500/20'
                          }`}>
                            {tx.type === 'deposit' ? (
                              <ArrowDownLeft className='text-green-600' size={20} />
                            ) : (
                              <ArrowUpRight className='text-red-600' size={20} />
                            )}
                          </div>
                          <div>
                            <p className='font-semibold text-foreground capitalize'>{tx.type}</p>
                            <p className='text-xs text-muted-foreground'>{new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className={`font-bold ${
                            tx.type === 'deposit'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-green-500/20 text-green-600'
                              : tx.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-600'
                              : 'bg-red-500/20 text-red-600'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='p-6 text-center'>
                  <p className='text-muted-foreground'>No transactions yet</p>
                </div>
              )}
            </div>

            {/* Deposit Address Section */}
            <div className='rounded-lg bg-card border border-border p-6'>
              <h3 className='text-lg font-bold text-foreground mb-4'>Deposit Address</h3>
              <div className='bg-muted/50 rounded-lg p-4'>
                <p className='text-xs text-muted-foreground mb-2'>Your Public Address</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 text-sm font-mono text-foreground break-all'>
                    1A1z7agoat7d8hgFmXqB1y4uq96g5dEQ5q
                  </code>
                  <button
                    onClick={() => copyToClipboard('1A1z7agoat7d8hgFmXqB1y4uq96g5dEQ5q')}
                    className='px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2'
                  >
                    <Copy size={16} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className='text-xs text-yellow-600 mt-3'>⚠️ Only send crypto to this address. Do not send other coins or tokens.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
