'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SubscriptionGateProps {
  providerId: string;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (method: 'BALANCE' | 'FRESH_USDT') => void;
}

export function SubscriptionGate({
  providerId,
  providerName,
  isOpen,
  onClose,
  onSubscribe
}: SubscriptionGateProps) {
  const [selectedType, setSelectedType] = useState<'PREMIUM' | 'VIP' | 'ELITE'>('PREMIUM');
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'FRESH_USDT'>('BALANCE');

  const pricing = {
    PREMIUM: 19.99,
    VIP: 49.99,
    ELITE: 99.99
  };

  const features = {
    PREMIUM: ['Daily trading signals', 'Signal archive access', 'Basic analytics'],
    VIP: ['Daily trading signals', 'Premium signal priority', 'Advanced analytics', '24/7 support'],
    ELITE: ['Daily trading signals', 'VIP signal priority', 'Expert analytics', 'Private chat support', 'Weekly webinars']
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subscribe to {providerName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {(['PREMIUM', 'VIP', 'ELITE'] as const).map((type) => (
            <Card
              key={type}
              className={`cursor-pointer transition-all ${
                selectedType === type ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedType(type)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{type}</CardTitle>
                <div className="text-2xl font-bold text-primary mt-2">
                  ${pricing[type]}/mo
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {features[type].map((feature, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Payment Method</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-secondary/50">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'BALANCE'}
                onChange={() => setPaymentMethod('BALANCE')}
              />
              <div>
                <p className="font-semibold">Account Balance</p>
                <p className="text-sm text-muted-foreground">Pay from your PowaBitz balance</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-secondary/50">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'FRESH_USDT'}
                onChange={() => setPaymentMethod('FRESH_USDT')}
              />
              <div>
                <p className="font-semibold">Fresh USDT</p>
                <p className="text-sm text-muted-foreground">Pay directly with USDT wallet</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => onSubscribe(paymentMethod)}
          >
            Subscribe - ${pricing[selectedType].toFixed(2)}/mo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
