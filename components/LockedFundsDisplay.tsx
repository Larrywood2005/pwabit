'use client';

import { useEffect, useState } from 'react';
import { Lock, Clock } from 'lucide-react';

interface Investment {
  _id: string;
  cryptoType: string;
  amount: number;
  lockedAmount?: number;
  tradeEndTime?: string;
  status: string;
}

interface LockedFundsDisplayProps {
  investments: Investment[];
}

export default function LockedFundsDisplay({ investments }: LockedFundsDisplayProps) {
  const [lockedFunds, setLockedFunds] = useState(0);
  const [activeTradeCount, setActiveTradeCount] = useState(0);

  useEffect(() => {
    const lockedTotal = investments.reduce((sum, inv) => {
      return sum + (inv.lockedAmount || 0);
    }, 0);

    const activeCount = investments.filter(inv => inv.tradeEndTime).length;

    setLockedFunds(lockedTotal);
    setActiveTradeCount(activeCount);
  }, [investments]);

  if (lockedFunds === 0 && activeTradeCount === 0) {
    return null;
  }

  return (
    <div className='p-4 rounded-lg bg-amber-500/10 border border-amber-500/20'>
      <div className='flex items-center gap-3'>
        <Lock className='text-amber-600' size={20} />
        <div className='flex-1'>
          <p className='font-semibold text-amber-900'>
            {activeTradeCount} Active Trade{activeTradeCount !== 1 ? 's' : ''}
          </p>
          <p className='text-sm text-amber-800'>
            ${lockedFunds.toLocaleString('en-US', { minimumFractionDigits: 2 })} locked for 24 hours
          </p>
        </div>
        <Clock className='text-amber-600' size={20} />
      </div>
    </div>
  );
}