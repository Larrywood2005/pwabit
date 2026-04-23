'use client';

import { useState } from 'react';
import { Search, Gift, AlertCircle, CheckCircle, X } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface GrantPowaUpByCodeProps {
  onClose: () => void;
}

export function GrantPowaUpByCodeModal({ onClose }: GrantPowaUpByCodeProps) {
  const [userCode, setUserCode] = useState('');
  const [amount, setAmount] = useState('');
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCode || userCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setSearching(true);
      setError('');
      setSuccess('');
      setFoundUser(null);

      const response = await apiClient.findUserByCode(userCode);
      setFoundUser(response.user);
    } catch (err: any) {
      setError(err.message || 'User not found');
      setFoundUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleGrantPowaUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) {
      setError('Please search for a user first');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid PowaUp amount');
      return;
    }

    try {
      setGranting(true);
      setError('');
      setSuccess('');

      const response = await apiClient.grantPowaUpByUserCode(userCode, Number(amount));

      setSuccess(`Successfully granted ${amount} PowaUp to ${response.user.fullName}`);
      
      setFoundUser({
        ...foundUser,
        powaUpBalance: response.user.newBalance
      });

      setAmount('');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to grant PowaUp');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-card rounded-lg max-w-md w-full p-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold text-foreground flex items-center gap-2'>
            <Gift size={24} className='text-purple-600' />
            Grant PowaUp by Code
          </h2>
          <button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
            <X size={24} />
          </button>
        </div>

        <div className='space-y-3'>
          <h3 className='font-semibold text-foreground'>Step 1: Find User</h3>
          <form onSubmit={handleSearchUser} className='space-y-3'>
            <input
              type='text'
              value={userCode}
              onChange={(e) => setUserCode(e.target.value.slice(0, 6))}
              placeholder='Enter 6-digit code'
              maxLength={6}
              className='w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              disabled={searching}
            />
            <button
              type='submit'
              disabled={searching || userCode.length !== 6}
              className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2'
            >
              <Search size={18} />
              {searching ? 'Searching...' : 'Search User'}
            </button>
          </form>
        </div>

        {foundUser && (
          <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2'>
            <div className='flex items-center gap-2 text-green-600'>
              <CheckCircle size={18} />
              <span className='font-semibold'>User Found!</span>
            </div>
            <div className='space-y-1 text-sm'>
              <p><span className='text-muted-foreground'>Name:</span> {foundUser.fullName}</p>
              <p><span className='text-muted-foreground'>Email:</span> {foundUser.email}</p>
              <p><span className='text-muted-foreground'>Current PowaUp:</span> <span className='font-mono font-bold text-primary'>{foundUser.powaUpBalance}</span></p>
            </div>
          </div>
        )}

        {foundUser && (
          <div className='space-y-3'>
            <h3 className='font-semibold text-foreground'>Step 2: Grant PowaUp</h3>
            <form onSubmit={handleGrantPowaUp} className='space-y-3'>
              <div>
                <label className='block text-sm text-muted-foreground mb-1'>Amount</label>
                <input
                  type='number'
                  min='1'
                  max='100000'
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder='Enter amount (max 100,000)'
                  className='w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                  disabled={granting}
                />
              </div>
              <button
                type='submit'
                disabled={granting || !amount}
                className='w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all'
              >
                {granting ? 'Granting...' : 'Grant PowaUp'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className='p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-600 text-sm flex items-start gap-2'>
            <AlertCircle size={18} className='flex-shrink-0 mt-0.5' />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className='p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-600 text-sm flex items-start gap-2'>
            <CheckCircle size={18} className='flex-shrink-0 mt-0.5' />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}
