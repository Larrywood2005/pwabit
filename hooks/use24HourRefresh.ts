import { useEffect } from 'react';

/**
 * Hook to refresh dashboard data every 24 hours
 * Ensures users see the most up-to-date balance and activity information
 */
export function use24HourRefresh(callback: () => void, dependencies: any[] = []) {
  useEffect(() => {
    // Execute callback immediately on mount
    callback();

    // Set up 24-hour refresh interval (86,400,000 milliseconds)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    const interval = setInterval(() => {
      console.log('[v0] Refreshing dashboard data (24-hour auto-refresh)');
      callback();
    }, TWENTY_FOUR_HOURS);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, dependencies);
}

/**
 * Hook to refresh data at regular intervals with exponential backoff for failures
 */
export function useSmartRefresh(
  callback: () => Promise<void>,
  initialInterval: number = 3000,
  maxInterval: number = 30000,
  dependencies: any[] = []
) {
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let currentInterval = initialInterval;
    let failureCount = 0;

    const executeRefresh = async () => {
      try {
        await callback();
        // Reset failure count and interval on success
        failureCount = 0;
        currentInterval = initialInterval;
      } catch (error) {
        console.error('[v0] Error in smart refresh:', error);
        failureCount++;
        // Exponential backoff: increase interval by 50% on each failure
        currentInterval = Math.min(currentInterval * 1.5, maxInterval);
      }

      // Schedule next refresh with updated interval
      interval = setTimeout(executeRefresh, currentInterval);
    };

    // Execute immediately
    executeRefresh();

    return () => {
      if (interval) clearTimeout(interval);
    };
  }, dependencies);
}
