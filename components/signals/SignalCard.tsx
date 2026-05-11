'use client';

import { Signal } from '@/types/signals';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SignalCardProps {
  signal: Signal;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

export function SignalCard({ signal, isSubscribed, onSubscribe }: SignalCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{signal.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{signal.tradingPair}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            signal.direction === 'BUY' ? 'bg-green-100 text-green-800' :
            signal.direction === 'SELL' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {signal.direction}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/50" />
          <div>
            <p className="font-semibold text-sm">{signal.providerName}</p>
            <p className="text-xs text-muted-foreground">
              {signal.winRatePercentage}% Win Rate
            </p>
          </div>
        </div>

        {/* Price Levels */}
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry:</span>
            <span className="font-semibold">${signal.entryPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target:</span>
            <span className="font-semibold text-green-600">${signal.targetPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stop Loss:</span>
            <span className="font-semibold text-red-600">${signal.stopLossPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Risk/Reward Ratio */}
        <div className="flex justify-between items-center bg-secondary/50 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">Risk/Reward:</span>
          <span className="font-semibold text-lg">{signal.riskRewardRatio.toFixed(2)}:1</span>
        </div>

        {/* Timeframe */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Timeframe:</span>
          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
            {signal.timeframe}
          </span>
        </div>

        {/* Status */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-3">
            {signal.status === 'ACTIVE' ? 'Signal Active - ' : ''}
            {new Date(signal.validUntil).toLocaleDateString()}
          </p>

          {!isSubscribed && (
            <Button className="w-full" onClick={() => {
              // TODO: Open subscription modal
              onSubscribe();
            }}>
              Subscribe to Provider
            </Button>
          )}

          {isSubscribed && (
            <Button variant="outline" className="w-full" disabled>
              ✓ Subscribed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
