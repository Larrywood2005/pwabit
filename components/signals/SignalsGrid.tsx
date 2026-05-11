'use client';

import { Signal } from '@/types/signals';
import { SignalCard } from './SignalCard';

interface SignalsGridProps {
  signals: Signal[];
  userSubscriptions: any[];
  onSubscribe: () => void;
}

export function SignalsGrid({ signals, userSubscriptions, onSubscribe }: SignalsGridProps) {
  const isSubscribedToProvider = (providerId: string) => {
    return userSubscriptions.some(sub => sub.providerId._id === providerId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {signals.map((signal) => (
        <SignalCard
          key={signal._id}
          signal={signal}
          isSubscribed={isSubscribedToProvider(signal.providerId._id)}
          onSubscribe={onSubscribe}
        />
      ))}
    </div>
  );
}
