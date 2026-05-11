'use client';

interface SignalFiltersProps {
  filters: { tradingPair: string | null; page: number };
  onFilterChange: (filters: any) => void;
}

const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'ADA/USDT', 'SOL/USDT', 'BNB/USDT'];

export function SignalFilters({ filters, onFilterChange }: SignalFiltersProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex-1">
        <label className="text-sm font-semibold text-muted-foreground mb-2 block">
          Trading Pair
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onFilterChange({ ...filters, tradingPair: null, page: 1 })}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filters.tradingPair === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Pairs
          </button>
          {TRADING_PAIRS.map((pair) => (
            <button
              key={pair}
              onClick={() => onFilterChange({ ...filters, tradingPair: pair, page: 1 })}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filters.tradingPair === pair
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
