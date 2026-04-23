'use client';

import { useState, useEffect } from 'react';
import { X, Mail, DollarSign, TrendingUp, Download, Wallet, CheckCircle, Clock, Gift } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface UserDetailsModalProps {
  userId: string;
  onClose: () => void;
}

export function AdminUserDetailsModal({ userId, onClose }: UserDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grantingPowaUp, setGrantingPowaUp] = useState(false);
  const [powaUpAmount, setPowaUpAmount] = useState('');
  const [grantSuccess, setGrantSuccess] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch full user data from admin endpoint - COMPLETE DATA
        const response = await apiClient.getAdminUserDetails(userId);
        setData(response);
      } catch (err: any) {
        console.error('[v0] Failed to fetch user details:', err);
        setError('Failed to load user details: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const handleGrantPowaUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!powaUpAmount || isNaN(Number(powaUpAmount)) || Number(powaUpAmount) <= 0) {
      setError('Please enter a valid PowaUp amount');
      return;
    }

    try {
      setGrantingPowaUp(true);
      setError('');
      setGrantSuccess('');
      
      const response = await apiClient.grantPowaUpToUser(userId, Number(powaUpAmount));
      
      setGrantSuccess(`Successfully granted ${powaUpAmount} PowaUp to user`);
      setPowaUpAmount('');
      
      // Refresh user data
      const updatedData = await apiClient.getAdminUserDetails(userId);
      setData(updatedData);
      
      setTimeout(() => setGrantSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to grant PowaUp: ' + (err.message || 'Unknown error'));
    } finally {
      setGrantingPowaUp(false);
    }
  };

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
        <div className='bg-card rounded-lg p-8'>
          <div className='flex justify-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
          </div>
          <p className='text-center text-sm text-muted-foreground mt-4'>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
        <div className='bg-card rounded-lg p-8 max-w-2xl'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-bold text-foreground'>User Details</h2>
            <button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
              <X size={24} />
            </button>
          </div>
          <p className='text-red-600'>{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const user = data.user || {};
  const financial = data.financialSummary || {};
  const kyc = data.kyc || {};
  const investments = data.investments || [];
  const withdrawals = data.withdrawals || [];
  const deposits = data.deposits || [];
  const allTransactions = data.allTransactions || [];
  const gameRewards = data.gameRewards || [];
  const stats = data.stats || {};

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-card rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full'>
        {/* Header */}
        <div className='sticky top-0 p-6 border-b border-border flex items-center justify-between bg-card z-10'>
          <h2 className='text-xl font-bold text-foreground'>User Details - {user.fullName}</h2>
          <button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-8'>
          {/* 👤 Profile Info */}
          <div className='space-y-4'>
            <h3 className='font-bold text-lg text-foreground'>👤 Profile Information</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>Full Name</p>
                <p className='font-semibold text-foreground'>{user.fullName}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1 flex items-center gap-2'>
                  <Mail size={14} />
                  Email
                </p>
                <p className='font-semibold text-foreground text-sm break-all'>{user.email}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>6-Digit Code</p>
                <p className='font-mono text-xl font-bold text-primary'>
                  {user.userCode || 'Not Assigned'}
                </p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>Role</p>
                <p className='font-semibold text-foreground capitalize'>{user.role || 'user'}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>Phone</p>
                <p className='font-semibold text-foreground'>{user.phone || 'Not provided'}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>Joined</p>
                <p className='font-semibold text-foreground text-sm'>{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-1'>Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  user.status === 'active' ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'
                }`}>
                  {user.status || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* 💰 Financial Summary - COMPLETE */}
          <div className='space-y-4'>
            <h3 className='font-bold text-lg text-foreground'>💰 Financial Summary</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Current Balance</p>
                <p className='text-2xl font-bold text-blue-600'>${financial.currentBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className='text-xs text-muted-foreground mt-2'>Raw balance in account</p>
              </div>
              <div className='p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Available Balance</p>
                <p className='text-2xl font-bold text-cyan-600'>${financial.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className='text-xs text-muted-foreground mt-2'>Current - Locked - Pending</p>
              </div>
              <div className='p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Locked in Trades</p>
                <p className='text-2xl font-bold text-yellow-600'>${financial.lockedInTrades?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className='text-xs text-muted-foreground mt-2'>Active trade investments</p>
              </div>
              <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Pending Withdrawal</p>
                <p className='text-2xl font-bold text-red-600'>${financial.pendingWithdrawal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className='text-xs text-muted-foreground mt-2'>In processing</p>
              </div>
              <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Total Invested</p>
                <p className='text-2xl font-bold text-green-600'>${financial.totalInvested?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-4 rounded-lg bg-purple-500/10 border border-purple-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Total Earnings</p>
                <p className='text-2xl font-bold text-purple-600'>${financial.totalEarnings?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-4 rounded-lg bg-orange-500/10 border border-orange-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Total Withdrawn</p>
                <p className='text-2xl font-bold text-orange-600'>${financial.totalWithdrawn?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-4 rounded-lg bg-pink-500/10 border border-pink-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>Total Deposited</p>
                <p className='text-2xl font-bold text-pink-600'>${financial.totalDeposited?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>PowaUp Balance</p>
                <p className='text-2xl font-bold text-indigo-600'>{financial.powaUpBalance || 0}</p>
              </div>
              <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20'>
                <p className='text-xs text-muted-foreground mb-2'>PowaUp Spent</p>
                <p className='text-2xl font-bold text-red-600'>{financial.powaUpSpent || 0}</p>
              </div>
            </div>
          </div>

          {/* 🎁 Grant PowaUp Credits */}
          <div className='space-y-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20'>
            <div className='flex items-center gap-2'>
              <Gift size={20} className='text-purple-600' />
              <h3 className='font-bold text-lg text-foreground'>🎁 Grant PowaUp Credits</h3>
            </div>
            
            <form onSubmit={handleGrantPowaUp} className='space-y-3'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-1'>
                  Amount to Grant
                </label>
                <div className='flex gap-2'>
                  <input
                    type='number'
                    min='1'
                    max='10000'
                    value={powaUpAmount}
                    onChange={(e) => setPowaUpAmount(e.target.value)}
                    placeholder='Enter PowaUp amount'
                    className='flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                    disabled={grantingPowaUp}
                  />
                  <button
                    type='submit'
                    disabled={grantingPowaUp || !powaUpAmount}
                    className='px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all'
                  >
                    {grantingPowaUp ? 'Granting...' : 'Grant'}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className='p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-600 text-sm'>
                  {error}
                </div>
              )}
              
              {grantSuccess && (
                <div className='p-3 bg-green-500/20 border border-green-500/40 rounded-lg text-green-600 text-sm'>
                  {grantSuccess}
                </div>
              )}
            </form>
          </div>

          {/* 🪪 KYC Details */}
          <div className='space-y-4'>
            <h3 className='font-bold text-lg text-foreground'>🪪 KYC Verification</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='p-4 rounded-lg bg-muted'>
                <p className='text-xs text-muted-foreground mb-2'>KYC Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  kyc.status === 'verified' ? 'bg-green-500/20 text-green-600' :
                  kyc.status === 'rejected' ? 'bg-red-500/20 text-red-600' :
                  'bg-yellow-500/20 text-yellow-600'
                }`}>
                  {kyc.status || 'Not Submitted'}
                </span>
              </div>
              {kyc.verifiedAt && (
                <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20'>
                  <p className='text-xs text-muted-foreground mb-2'>Verified On</p>
                  <p className='font-semibold text-green-600'>{new Date(kyc.verifiedAt).toLocaleDateString()}</p>
                </div>
              )}
              {kyc.rejectedAt && (
                <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20'>
                  <p className='text-xs text-muted-foreground mb-2'>Rejected On</p>
                  <p className='font-semibold text-red-600'>{new Date(kyc.rejectedAt).toLocaleDateString()}</p>
                  {kyc.rejectionReason && <p className='text-xs mt-2'>{kyc.rejectionReason}</p>}
                </div>
              )}
            </div>
          </div>

          {/* 📊 Transactions - ALL */}
          {allTransactions.length > 0 && (
            <div className='space-y-4'>
              <h3 className='font-bold text-lg text-foreground'>📊 Recent Transactions (Latest 20)</h3>
              <div className='divide-y divide-border border border-border rounded-lg overflow-hidden max-h-80 overflow-y-auto'>
                {allTransactions.map((tx: any) => (
                  <div key={tx._id} className='p-4 hover:bg-muted/50 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-semibold text-foreground capitalize'>{tx.type.replace(/_/g, ' ')}</p>
                        <p className='text-xs text-muted-foreground'>{new Date(tx.createdAt).toLocaleString()}</p>
                      </div>
                      <div className='text-right'>
                        <p className={`font-bold ${['deposit', 'referral_commission', 'game_reward', 'daily_bonus'].includes(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                          {['deposit', 'referral_commission', 'game_reward', 'daily_bonus'].includes(tx.type) ? '+' : '-'}${tx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0'}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                          tx.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                          tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                          'bg-red-500/20 text-red-600'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🎮 Game Rewards */}
          {gameRewards.length > 0 && (
            <div className='space-y-4'>
              <h3 className='font-bold text-lg text-foreground'>🎮 Game Rewards (Latest 10)</h3>
              <div className='divide-y divide-border border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto'>
                {gameRewards.map((reward: any) => (
                  <div key={reward._id} className='p-4 hover:bg-muted/50 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-semibold text-foreground'>{reward.description || reward.type}</p>
                        <p className='text-xs text-muted-foreground'>{new Date(reward.createdAt).toLocaleString()}</p>
                      </div>
                      <p className='font-bold text-green-600'>+${reward.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistics Summary */}
          <div className='space-y-4'>
            <h3 className='font-bold text-lg text-foreground'>📈 Statistics Summary</h3>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Active Investments</p>
                <p className='text-2xl font-bold text-foreground'>{financial.activeInvestments || 0}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Total Transactions</p>
                <p className='text-2xl font-bold text-foreground'>{stats.totalTransactions || 0}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Pending Withdrawals</p>
                <p className='text-2xl font-bold text-yellow-600'>{stats.pendingWithdrawals || 0}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Completed Withdrawals</p>
                <p className='text-2xl font-bold text-green-600'>{stats.completedWithdrawals || 0}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Total Earned</p>
                <p className='text-xl font-bold text-purple-600'>${stats.totalEarned?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-4 rounded-lg bg-muted text-center'>
                <p className='text-xs text-muted-foreground mb-2'>Game Bonuses</p>
                <p className='text-xl font-bold text-blue-600'>${stats.puzzleGameBonuses?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Close button at bottom */}
          <div className='flex justify-end pt-4'>
            <button
              onClick={onClose}
              className='px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
