'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SignalsGrid } from '@/components/signals/SignalsGrid';
import { SignalFilters } from '@/components/signals/SignalFilters';
import { SubscriptionGate } from '@/components/signals/SubscriptionGate';

export default function SignalsPage() {
  const { user } = useAuth();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ tradingPair: null, page: 1 });
  const [totalPages, setTotalPages] = useState(1);
  const [userSubscriptions, setUserSubscriptions] = useState([]);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: filters.page.toString(),
          limit: '20',
          ...(filters.tradingPair && { tradingPair: filters.tradingPair })
        });

        const response = await fetch(`/api/signals/published?${params}`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch signals');

        const data = await response.json();
        setSignals(data.signals);
        setTotalPages(data.pagination.pages);
      } catch (error) {
        console.error('[v0] Error fetching signals:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) fetchSignals();
  }, [filters, user?.token]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await fetch('/api/signals/my/subscriptions', {
          headers: { Authorization: `Bearer ${user?.token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch subscriptions');

        const data = await response.json();
        setUserSubscriptions(data);
      } catch (error) {
        console.error('[v0] Error fetching subscriptions:', error);
      }
    };

    if (user?.token) fetchSubscriptions();
  }, [user?.token]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Trading Signals</h1>
          <p className="text-muted-foreground">
            Subscribe to top traders and follow their market signals
          </p>
        </div>

        {/* Filters */}
        <SignalFilters filters={filters} onFilterChange={setFilters} />

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No signals available</p>
          </div>
        ) : (
          <>
            <SignalsGrid 
              signals={signals} 
              userSubscriptions={userSubscriptions}
              onSubscribe={() => setUserSubscriptions([...userSubscriptions])}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setFilters({ ...filters, page })}
                    className={`px-4 py-2 rounded-md ${
                      filters.page === page
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
