import { useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

/**
 * Hook to automatically complete trades after 24 hours
 * Checks every minute for trades that are ready to complete
 */
export function useTradeCompletion(investments: any[]) {
  const checkAndCompleteTrades = useCallback(async () => {
    try {
      const now = Date.now();
      
      for (const investment of investments) {
        // Skip if no active trade
        if (!investment.tradeInProgress || !investment.tradeStartTime) continue;
        
        const tradeStartTime = new Date(investment.tradeStartTime).getTime();
        const elapsed = (now - tradeStartTime) / (1000 * 60 * 60); // hours elapsed
        
        // If 24 hours have passed, complete the trade
        if (elapsed >= 24) {
          console.log('[v0] Auto-completing trade for investment:', investment._id);
          
          try {
            await apiClient.completeTrade(investment._id);
            console.log('[v0] Trade completed successfully:', investment._id);
          } catch (error) {
            console.error('[v0] Error completing trade:', error);
          }
        }
      }
    } catch (error) {
      console.error('[v0] Error in trade completion check:', error);
    }
  }, [investments]);
  
  // Check every minute for trades to complete
  useEffect(() => {
    // Run immediately on mount
    checkAndCompleteTrades();
    
    // Then check every minute
    const interval = setInterval(checkAndCompleteTrades, 60000); // 1 minute
    
    return () => clearInterval(interval);
  }, [checkAndCompleteTrades]);
}
