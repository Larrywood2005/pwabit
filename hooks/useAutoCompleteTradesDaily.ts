'use client';

import { useEffect } from 'react';
import { apiClient } from '@/lib/api';

export function useAutoCompleteTradesDaily(investments: any[] = []) {
  useEffect(() => {
    if (!investments || investments.length === 0) return;

    const checkAndCompleteTrades = async () => {
      for (const investment of investments) {
        // Check if investment has active trade
        if (investment.tradeInProgress && investment.tradeEndTime) {
          const endTime = new Date(investment.tradeEndTime).getTime();
          const now = Date.now();

          // If trade period has ended, complete it
          if (now >= endTime) {
            try {
              console.log('[v0] Auto-completing trade for investment:', investment._id);
              const result = await apiClient.completeTrade(investment._id);
              console.log('[v0] Trade completed successfully:', result);
            } catch (error) {
              console.error('[v0] Failed to auto-complete trade:', error);
            }
          }
        }
      }
    };

    // Check immediately on mount
    checkAndCompleteTrades();

    // Then check every 24 hours (86,400,000 ms)
    const interval = setInterval(checkAndCompleteTrades, 86400000);

    return () => clearInterval(interval);
  }, [investments]);
}
