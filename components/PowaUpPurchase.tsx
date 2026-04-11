'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Zap, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

interface PowaUpBalance {
  powaUpBalance: number;
  powaUpSpent: number;
  totalPowaUpPurchased: number;
}

interface UserBalance {
  totalBalance: number;
  availableBalance: number;
  lockedInTrades: number;
}

export default function PowaUpPurchase() {
  const [powaUpBalance, setPowaUpBalance] = useState<PowaUpBalance | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const POWAUP_PRICE = 0.30;
  const presetAmounts = [10, 50, 100, 500];

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const [powaUp, balance] = await Promise.all([
        apiClient.getPowaUpBalance(),
        apiClient.getBalanceInfo(),
      ]);
      setPowaUpBalance(powaUp);
      setUserBalance(balance);
      setError('');
    } catch (err: any) {
      console.error('[v0] Error fetching balances:', err);
      setError('Failed to load balance information');
    } finally {
      setLoading(false);
    }
  };

  const getAmount = () => {
    return customAmount ? parseInt(customAmount) : selectedAmount;
  };

  const calculateCost = () => {
    return getAmount() * POWAUP_PRICE;
  };

  const canAfford = () => {
    if (!userBalance) return false;
    const cost = calculateCost();
    // Use TOTAL BALANCE for PowaUp purchases (invested + earnings + cash)
    return userBalance.totalBalance >= cost;
  };

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      setError('');
      setSuccess('');

      const amount = getAmount();
      const cost = calculateCost();

      if (!amount || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (!canAfford()) {
        setError(`Insufficient balance. You need $${cost.toFixed(2)} but have $${userBalance?.totalBalance.toFixed(2)} in Total Balance`);
        return;
      }

      const result = await apiClient.purchasePowaUp(amount);

      // Update balances with response
      setPowaUpBalance({
        powaUpBalance: result.powaUpBalance,
        powaUpSpent: powaUpBalance?.powaUpSpent || 0,
        totalPowaUpPurchased: (powaUpBalance?.totalPowaUpPurchased || 0) + amount,
      });

      setUserBalance({
        totalBalance: result.newBalance,
        availableBalance: result.availableBalance,
        lockedInTrades: userBalance?.lockedInTrades || 0,
      });

      setSuccess(`Successfully purchased ${amount} PowaUp! Balance updated in real-time.`);
      
      // Reset form
      setCustomAmount('');
      setSelectedAmount(10);

      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('[v0] Purchase error:', err);
      setError(err.message || 'Failed to purchase PowaUp. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Card className='p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 animate-pulse'>
        <div className='h-64 rounded-lg bg-muted' />
      </Card>
    );
  }

  return (
    <Card className='p-4 sm:p-6 md:p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20'>
      <div className='space-y-4 sm:space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4'>
          <div className='flex-1 min-w-0'>
            <h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2'>
              <Zap className='w-5 h-5 sm:w-6 sm:h-6 text-purple-500 flex-shrink-0' />
              Buy PowaUp Credits
            </h2>
            <p className='text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2'>
              Purchase PowaUp to unlock enhanced trading features and get trading bonuses
            </p>
          </div>
          <div className='text-right flex-shrink-0'>
            <p className='text-[10px] sm:text-xs text-muted-foreground'>Your Balance</p>
            <p className='text-lg sm:text-2xl font-bold text-foreground break-words'>
              {powaUpBalance?.powaUpBalance || 0}
            </p>
            <p className='text-[10px] sm:text-xs text-purple-500 font-semibold'>PowaUp</p>
          </div>
        </div>

        {/* Pricing Info */}
        <div className='grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-background/50 border border-border'>
          <div>
            <p className='text-xs text-muted-foreground'>Price Per Unit</p>
            <p className='text-base sm:text-lg font-bold text-foreground'>${POWAUP_PRICE.toFixed(2)}</p>
          </div>
          <div className='text-right'>
            <p className='text-xs text-muted-foreground'>Your Total Balance</p>
            <p className='text-base sm:text-lg font-bold text-foreground break-words'>
              ${userBalance?.totalBalance.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {/* Preset Amounts */}
        <div>
          <p className='text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3'>Quick Purchase</p>
          <div className='grid grid-cols-4 gap-1.5 sm:gap-2'>
            {presetAmounts.map((amount) => {
              const cost = amount * POWAUP_PRICE;
              const affordable = userBalance ? userBalance.totalBalance >= cost : false;
              return (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  disabled={!affordable}
                  className={`p-2 sm:p-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    selectedAmount === amount && !customAmount
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-background border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className='font-bold'>{amount}</div>
                  <div className='text-[10px] sm:text-xs opacity-75'>${cost.toFixed(2)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <p className='text-xs sm:text-sm font-semibold text-foreground mb-2'>Custom Amount</p>
          <div className='flex gap-2'>
            <input
              type='number'
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              placeholder='Enter amount'
              min='1'
              className='flex-1 px-3 sm:px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'
            />
            <div className='px-3 sm:px-4 py-2 rounded-lg bg-background border border-border text-right min-w-fit'>
              <p className='text-[10px] sm:text-xs text-muted-foreground'>Cost</p>
              <p className='font-bold text-foreground text-sm sm:text-base'>${calculateCost().toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Balance Warning */}
        {!canAfford() && userBalance && (
          <div className='p-3 sm:p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1 text-sm text-orange-600'>
              <p className='font-semibold text-xs sm:text-sm'>Insufficient Balance</p>
              <p className='text-xs mt-1'>
                You need ${calculateCost().toFixed(2)} but your Total Balance is ${userBalance.totalBalance.toFixed(2)}.
                {userBalance.lockedInTrades > 0 && (
                  <span> You have ${userBalance.lockedInTrades.toFixed(2)} locked in active trades.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-xs sm:text-sm font-semibold text-red-600'>{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className='p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3'>
            <CheckCircle className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-xs sm:text-sm font-semibold text-green-600'>{success}</p>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={purchasing || !canAfford() || !getAmount()}
          className='w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-2 sm:py-3 disabled:opacity-50 text-sm sm:text-base'
        >
          {purchasing ? (
            <span className='flex items-center gap-2 justify-center'>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Processing...
            </span>
          ) : (
            <span className='flex items-center gap-2 justify-center'>
              <ShoppingCart className='w-4 h-4 sm:w-5 sm:h-5' />
              Buy {getAmount()} PowaUp for ${calculateCost().toFixed(2)}
            </span>
          )}
        </Button>

        {/* Benefits */}
        <div className='p-3 sm:p-4 rounded-lg bg-background/50 border border-border'>
          <p className='text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2'>
            <TrendingUp className='w-4 h-4 text-green-500' />
            What PowaUp Does
          </p>
          <ul className='space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground'>
            <li className='flex gap-2'>
              <span className='text-purple-500 flex-shrink-0'>•</span>
              <span>Activate trading bonuses and multipliers</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500 flex-shrink-0'>•</span>
              <span>Unlock premium trading strategies</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500 flex-shrink-0'>•</span>
              <span>Get enhanced return opportunities</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500 flex-shrink-0'>•</span>
              <span>Access exclusive market signals</span>
            </li>
          </ul>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-border'>
          <div>
            <p className='text-[10px] sm:text-xs text-muted-foreground'>Total Purchased</p>
            <p className='text-base sm:text-lg font-bold text-foreground'>
              {powaUpBalance?.totalPowaUpPurchased || 0}
            </p>
          </div>
          <div>
            <p className='text-[10px] sm:text-xs text-muted-foreground'>Currently Used</p>
            <p className='text-base sm:text-lg font-bold text-foreground'>
              {powaUpBalance?.powaUpSpent || 0}
            </p>
          </div>
          <div>
            <p className='text-[10px] sm:text-xs text-muted-foreground'>Spent</p>
            <p className='text-base sm:text-lg font-bold text-foreground break-words'>
              ${((powaUpBalance?.totalPowaUpPurchased || 0) * POWAUP_PRICE).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
            })}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <p className='text-sm font-semibold text-foreground mb-2'>Custom Amount</p>
          <div className='flex gap-2'>
            <input
              type='number'
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              placeholder='Enter amount'
              min='1'
              className='flex-1 px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500'
            />
            <div className='px-4 py-2 rounded-lg bg-background border border-border text-right min-w-fit'>
              <p className='text-xs text-muted-foreground'>Cost</p>
              <p className='font-bold text-foreground'>${calculateCost().toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Balance Warning */}
        {!canAfford() && userBalance && (
          <div className='p-3 sm:p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1 text-sm text-orange-600'>
              <p className='font-semibold'>Insufficient Balance</p>
              <p className='text-xs mt-1'>
                You need ${calculateCost().toFixed(2)} but your Total Balance is ${userBalance.totalBalance.toFixed(2)}.
                {userBalance.lockedInTrades > 0 && (
                  <span> You have ${userBalance.lockedInTrades.toFixed(2)} locked in active trades.</span>
                )}
              </p>
            </div>
          </div>
        )}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-red-600'>{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3'>
            <CheckCircle className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-green-600'>{success}</p>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={purchasing || !canAfford() || !getAmount()}
          className='w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 disabled:opacity-50'
        >
          {purchasing ? (
            <span className='flex items-center gap-2'>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Processing...
            </span>
          ) : (
            <span className='flex items-center gap-2'>
              <ShoppingCart className='w-5 h-5' />
              Buy {getAmount()} PowaUp for ${calculateCost().toFixed(2)}
            </span>
          )}
        </Button>

        {/* Benefits */}
        <div className='p-4 rounded-lg bg-background/50 border border-border'>
          <p className='text-sm font-semibold text-foreground mb-3 flex items-center gap-2'>
            <TrendingUp className='w-4 h-4 text-green-500' />
            What PowaUp Does
          </p>
          <ul className='space-y-2 text-sm text-muted-foreground'>
            <li className='flex gap-2'>
              <span className='text-purple-500'>•</span>
              <span>Activate trading bonuses and multipliers</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500'>•</span>
              <span>Unlock premium trading strategies</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500'>•</span>
              <span>Get enhanced return opportunities</span>
            </li>
            <li className='flex gap-2'>
              <span className='text-purple-500'>•</span>
              <span>Access exclusive market signals</span>
            </li>
          </ul>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-3 p-4 rounded-lg bg-background/50 border border-border'>
          <div>
            <p className='text-xs text-muted-foreground'>Total Purchased</p>
            <p className='text-lg font-bold text-foreground'>
              {powaUpBalance?.totalPowaUpPurchased || 0}
            </p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Currently Used</p>
            <p className='text-lg font-bold text-foreground'>
              {powaUpBalance?.powaUpSpent || 0}
            </p>
          </div>
          <div>
            <p className='text-xs text-muted-foreground'>Spent</p>
            <p className='text-lg font-bold text-foreground'>
              ${((powaUpBalance?.totalPowaUpPurchased || 0) * POWAUP_PRICE).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
