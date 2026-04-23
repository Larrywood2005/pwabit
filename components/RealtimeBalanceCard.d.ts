export type BalanceData = {
  totalBalance: number;
  availableBalance: number;
  lockedInTrades: number;
  pendingWithdrawal: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
  powaUpBalance: number;
};

export type RealtimeBalanceCardProps = {
  onWithdrawClick?: () => void;
  onPowaUpClick?: () => void;
};
