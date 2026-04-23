'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import TradingHistory from '@/components/TradingHistory';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TradeData {
  trades: any[];
  stats: {
    totalTrades: number;
    totalProfit: number;
    averageProfitPerTrade: number;
    successRate: number;
  };
}

export default function TradingHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<TradeData>({
    trades: [],
    stats: {
      totalTrades: 0,
      totalProfit: 0,
      averageProfitPerTrade: 0,
      successRate: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTradingHistory = async () => {
      try {
        setLoading(true);
        const investments = await apiClient.getUserInvestments(1, 100);
        
        // Collect all trades from all investments
        const allTrades = investments.data
          ?.flatMap((inv: any) => 
            (inv.tradeHistory || []).map((trade: any) => ({
              ...trade,
              investmentId: inv._id,
              packageName: inv.packageName,
              dailyReturnPercent: inv.dailyReturnPercent
            }))
          )
          .sort((a: any, b: any) => 
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          ) || [];

        // Calculate stats
        const completedTrades = allTrades.filter((t: any) => t.status === 'completed');
        const totalProfit = completedTrades.reduce((sum: number, t: any) => sum + (t.profitAmount || 0), 0);
        const averageProfitPerTrade = completedTrades.length > 0 ? totalProfit / completedTrades.length : 0;

        setData({
          trades: allTrades,
          stats: {
            totalTrades: completedTrades.length,
            totalProfit,
            averageProfitPerTrade,
            successRate: 100 // All completed trades are successful by definition
          }
        });
      } catch (err: any) {
        console.error('[v0] Error fetching trading history:', err);
        setError('Failed to load trading history');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTradingHistory();
    }
  }, [user]);

  return (
    <ProtectedRoute requireUser>
      <div className='space-y-8'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/dashboard'
              className='p-2 hover:bg-muted rounded-lg transition-colors'
            >
              <ArrowLeft size={20} className='text-muted-foreground' />
            </Link>
            <div>
              <h1 className='text-3xl font-bold text-foreground'>Trading History</h1>
              <p className='text-muted-foreground mt-1'>Complete record of all your trades</p>
            </div>
          </div>
          <TrendingUp size={32} className='text-primary' />
        </div>

        {/* Error Message */}
        {error && (
          <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
            {error}
          </div>
        )}

        {/* Advanced Stats */}
        {!loading && (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='p-6 rounded-lg bg-card border border-border'>
              <p className='text-sm text-muted-foreground mb-2'>Total Completed Trades</p>
              <p className='text-3xl font-bold text-foreground'>{data.stats.totalTrades}</p>
            </div>
            <div className='p-6 rounded-lg bg-card border border-border'>
              <p className='text-sm text-muted-foreground mb-2'>Total Profit Earned</p>
              <p className='text-3xl font-bold text-green-600'>${data.stats.totalProfit.toFixed(2)}</p>
            </div>
            <div className='p-6 rounded-lg bg-card border border-border'>
              <p className='text-sm text-muted-foreground mb-2'>Average Profit per Trade</p>
              <p className='text-3xl font-bold text-blue-600'>${data.stats.averageProfitPerTrade.toFixed(2)}</p>
            </div>
            <div className='p-6 rounded-lg bg-card border border-border'>
              <p className='text-sm text-muted-foreground mb-2'>Success Rate</p>
              <p className='text-3xl font-bold text-emerald-600'>{data.stats.successRate}%</p>
            </div>
          </div>
        )}

        {/* Trading History */}
        <TradingHistory trades={data.trades} loading={loading} />
      </div>
    </ProtectedRoute>
  );
}
