export interface Signal {
  _id: string;
  title: string;
  description: string;
  tradingPair: 'BTC/USDT' | 'ETH/USDT' | 'XRP/USDT' | 'ADA/USDT' | 'SOL/USDT' | 'BNB/USDT';
  direction: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  winRatePercentage: number;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'PARTIAL_HIT';
  isPublished: boolean;
  resultPrice: number | null;
  resultStatus: 'WIN' | 'LOSS' | 'BREAKEVEN' | null;
  timeframe: '15M' | '1H' | '4H' | '1D' | '1W';
  validUntil: string;
  providerId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  providerName: string;
  subscribers: number;
  createdAt: string;
  publishedAt: string | null;
  closedAt: string | null;
}

export interface SignalSubscription {
  _id: string;
  userId: string;
  providerId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  subscriptionType: 'PREMIUM' | 'VIP' | 'ELITE';
  monthlyPrice: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  isAutoRenewal: boolean;
  lastPaymentDate: string | null;
  nextRenewalDate: string;
  totalSignalsReceived: number;
  totalWins: number;
  totalLosses: number;
  winRatePercentage: number;
  totalProfitLoss: number;
  providerStats: {
    totalSignals: number;
    totalWins: number;
    totalLosses: number;
    winRatePercentage: number;
    activeSubscribers: number;
    totalRevenue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SignalTransaction {
  _id: string;
  signalId: string;
  subscriptionId: string;
  userId: string;
  providerId: string;
  type: 'SIGNAL_SUBSCRIPTION' | 'RENEWAL' | 'UPGRADE';
  amount: number;
  currency: string;
  paymentMethod: 'BALANCE' | 'FRESH_USDT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  providerRevenue: number;
  platformFee: number;
  createdAt: string;
  completedAt: string | null;
}

export interface SignalPayment {
  _id: string;
  signalTransactionId: string;
  userId: string;
  providerId: string;
  amount: number;
  currency: 'USDT' | 'USDC' | 'DAI';
  network: 'ETHEREUM' | 'POLYGON' | 'TRON' | 'BSC';
  fromAddress: string;
  toAddress: string;
  txHash: string | null;
  paymentStatus: 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  confirmations: number;
  requiredConfirmations: number;
  createdAt: string;
  confirmedAt: string | null;
  expiresAt: string;
}
