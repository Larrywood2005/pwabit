'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Image from 'next/image';

interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  image?: string;
}

export default function CryptoTicker() {
  const [prices, setPrices] = useState<CryptoPrice[]>([
    { 
      symbol: 'BTC', 
      price: 67534, 
      change24h: 2.5,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/btc.jfif-H23vBuHv6jrIb3hZTIk1fw13u9wPk2.jpeg'
    },
    { 
      symbol: 'ETH', 
      price: 3456, 
      change24h: 1.8,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/eth-aIcRvk5vtCq57dO9wWmGaiFwTpoA88.png'
    },
    { 
      symbol: 'USDT', 
      price: 1.0, 
      change24h: 0.1,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/USDT-RwpeE6U2nnxrmB48HTQzENEJhPpRbm.png'
    },
    { 
      symbol: 'SOL', 
      price: 189.45, 
      change24h: 3.2,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SOL.jfif-jHlH9IEPabqvNg0s4S35Ms8o7BwNHr.jpeg'
    },
    { 
      symbol: 'ADA', 
      price: 0.98, 
      change24h: -0.5,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ADA.jfif-ZhCZC5c2Sw9rfgVcgO3Ig5Jkrwa6D8.jpeg'
    },
    { 
      symbol: 'XRP', 
      price: 2.34, 
      change24h: 1.2,
      image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/XRP.jfif-FFXkwilDR3g7xxwK8DhiarpEOg7LAP.jpeg'
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prevPrices) =>
        prevPrices.map((crypto) => ({
          ...crypto,
          price: crypto.price * (1 + (Math.random() - 0.5) * 0.02),
          change24h: crypto.change24h + (Math.random() - 0.5) * 0.3,
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='w-full overflow-x-auto'>
      <div className='flex gap-4 pb-4 min-w-min px-4'>
        {prices.map((crypto) => (
          <div
            key={crypto.symbol}
            className='flex-shrink-0 p-4 rounded-lg bg-card border border-border hover:border-primary transition-all'
          >
            <div className='flex items-center gap-3'>
              {crypto.image ? (
                <div className='w-10 h-10 relative rounded-full overflow-hidden flex-shrink-0'>
                  <img 
                    src={crypto.image} 
                    alt={crypto.symbol}
                    className='w-full h-full object-cover rounded-full'
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className='w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                  {crypto.symbol.slice(0, 1)}
                </div>
              )}
              <div>
                <div className='font-semibold text-foreground'>{crypto.symbol}</div>
                <div className='text-sm text-muted-foreground'>${crypto.price.toFixed(2)}</div>
              </div>
            </div>
            <div className={`mt-2 flex items-center gap-1 ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {crypto.change24h >= 0 ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span className='text-sm font-semibold'>
                {Math.abs(crypto.change24h).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
