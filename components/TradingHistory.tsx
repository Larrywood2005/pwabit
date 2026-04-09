'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Calendar, Clock, DollarSign } from 'lucide-react';

interface TradeRecord {
  _id: string;
  startTime: string;
  endTime: string;
  lockedAmount: number;
  profitAmount: number;
  profitPercentage: number;
  status: 'completed' | 'active';
}

interface TradingHistoryProps {
  trades: TradeRecord[];
  loading?: boolean;
}

export default function TradingHistory({ trades = [], loading = false }: TradingHistoryProps) {
  if (loading) {
    return (
      <div className="p-6 rounded-lg border border-border bg-card animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }
  
  if (trades.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-border bg-card text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground font-medium">No trading history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your completed trades will appear here
        </p>
      </div>
    );
  }
  
  const completedTrades = trades.filter(t => t.status === 'completed');
  const totalProfit = completedTrades.reduce((sum, t) => sum + (t.profitAmount || 0), 0);
  const totalTrades = completedTrades.length;
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-2">Total Completed Trades</p>
          <p className="text-2xl font-bold text-foreground">{totalTrades}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-2">Total Profit</p>
          <p className="text-2xl font-bold text-green-600">${totalProfit.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <p className="text-sm text-muted-foreground mb-2">Average Profit per Trade</p>
          <p className="text-2xl font-bold text-blue-600">
            ${totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>
      
      {/* History Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Time</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Account Amount</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Profit</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {completedTrades.map((trade) => {
                const startDate = new Date(trade.startTime);
                const endDate = new Date(trade.endTime);
                const date = startDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const time = startDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                const profitPercentage = trade.profitPercentage || 10;
                const isPositive = trade.profitAmount >= 0;
                
                return (
                  <tr key={trade._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Calendar size={16} className="text-muted-foreground" />
                        {date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock size={16} className="text-muted-foreground" />
                        {time}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-foreground">
                        ${trade.lockedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPositive ? (
                          <TrendingUp size={16} className="text-green-600" />
                        ) : (
                          <TrendingDown size={16} className="text-red-600" />
                        )}
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}${Math.abs(trade.profitAmount).toFixed(2)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {isPositive ? '+' : '-'}{profitPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700">
                        Completed
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
