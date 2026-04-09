'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  isTrading?: boolean;
  width?: number;
  height?: number;
  animated?: boolean;
}

export default function CandlestickChart({
  isTrading = false,
  width: propWidth,
  height: propHeight,
  animated = true
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 400, height: propHeight || 250 });
  const [candles, setCandles] = useState<Candle[]>([]);

  // Responsive dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Mobile-first responsive sizing
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        const isTablet = typeof window !== 'undefined' && window.innerWidth >= 640 && window.innerWidth < 1024;
        
        let chartWidth = propWidth || containerWidth || 400;
        let chartHeight = propHeight || (isMobile ? 180 : isTablet ? 250 : 350);
        
        // Constrain to container
        chartWidth = Math.min(chartWidth, containerWidth || 800);
        
        setDimensions({ width: chartWidth, height: chartHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [propWidth, propHeight]);

  const { width, height } = dimensions;
  
  // Generate realistic mock candlestick data
  useEffect(() => {
    const generateCandles = () => {
      const newCandles: Candle[] = [];
      let basePrice = 35000;
      
      for (let i = 0; i < 20; i++) {
        const volatility = 200 + Math.random() * 400;
        const open = basePrice + (Math.random() - 0.5) * volatility;
        const close = basePrice + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * 300;
        const low = Math.min(open, close) - Math.random() * 300;
        
        newCandles.push({
          time: i,
          open: Math.round(open),
          high: Math.round(high),
          low: Math.round(low),
          close: Math.round(close)
        });
        
        basePrice = close;
      }
      
      return newCandles;
    };
    
    setCandles(generateCandles());
  }, []);
  
  // Animate new candle when trading
  useEffect(() => {
    if (!isTrading || !animated) return;
    
    const interval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        
        const lastCandle = prev[prev.length - 1];
        const newCandle: Candle = {
          time: lastCandle.time + 1,
          open: lastCandle.close + (Math.random() - 0.5) * 200,
          close: lastCandle.close + (Math.random() - 0.5) * 200,
          high: 0,
          low: 0
        };
        
        newCandle.high = Math.max(newCandle.open, newCandle.close) + Math.random() * 300;
        newCandle.low = Math.min(newCandle.open, newCandle.close) - Math.random() * 300;
        
        return [...prev.slice(-19), newCandle];
      });
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [isTrading, animated]);
  
  if (candles.length === 0) {
    return (
      <div ref={containerRef} className="w-full bg-muted rounded-lg flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground text-xs sm:text-sm">Loading chart...</p>
      </div>
    );
  }
  
  // Calculate price range
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;
  
  const chartMinPrice = minPrice - padding;
  const chartMaxPrice = maxPrice + padding;
  const chartPriceRange = chartMaxPrice - chartMinPrice;
  
  // Canvas dimensions
  const candleWidth = (width - 60) / candles.length;
  const candleSpacing = candleWidth * 0.2;
  const actualCandleWidth = candleWidth - candleSpacing;
  
  const priceToY = (price: number) => {
    return height - 40 - ((price - chartMinPrice) / chartPriceRange) * (height - 80);
  };
  
  const isMobile = width < 400;

  return (
    <div ref={containerRef} className="relative bg-muted rounded-lg overflow-hidden w-full" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 100%)' }}
      >
        {/* Vertical grid lines */}
        {candles.map((_, i) => (
          <line
            key={`vgrid-${i}`}
            x1={40 + (i + 0.5) * candleWidth}
            y1="20"
            x2={40 + (i + 0.5) * candleWidth}
            y2={height - 40}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        
        {/* Horizontal grid lines */}
        {[0, 1, 2, 3, 4].map((_, i) => {
          const y = 20 + (i / 4) * (height - 60);
          const price = chartMaxPrice - (i / 4) * chartPriceRange;
          
          return (
            <g key={`hgrid-${i}`}>
              <line
                x1="40"
                y1={y}
                x2={width}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={isMobile ? 5 : 10}
                y={y + 4}
                fontSize={isMobile ? 8 : 12}
                fill="rgba(255,255,255,0.6)"
                textAnchor="end"
              >
                ${isMobile ? (Math.round(price) / 1000).toFixed(0) + 'k' : Math.round(price).toLocaleString()}
              </text>
            </g>
          );
        })}
        
        {/* Candlesticks */}
        {candles.map((candle, i) => {
          const x = 40 + i * candleWidth + candleSpacing / 2;
          const yHigh = priceToY(candle.high);
          const yLow = priceToY(candle.low);
          const yOpen = priceToY(candle.open);
          const yClose = priceToY(candle.close);
          
          const isGreen = candle.close >= candle.open;
          const bodyTop = isGreen ? yClose : yOpen;
          const bodyBottom = isGreen ? yOpen : yClose;
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          
          return (
            <g key={`candle-${i}`}>
              {/* Wick */}
              <line
                x1={x + actualCandleWidth / 2}
                y1={yHigh}
                x2={x + actualCandleWidth / 2}
                y2={yLow}
                stroke={isGreen ? '#10b981' : '#ef4444'}
                strokeWidth="1"
              />
              
              {/* Body */}
              <rect
                x={x}
                y={bodyTop}
                width={actualCandleWidth}
                height={bodyHeight}
                fill={isGreen ? '#10b981' : '#ef4444'}
                stroke={isGreen ? '#059669' : '#dc2626'}
                strokeWidth="1"
                opacity={isTrading && i === candles.length - 1 ? 0.8 : 1}
              />
            </g>
          );
        })}
        
        {/* Current price indicator */}
        {isTrading && candles.length > 0 && (
          <g>
            <circle
              cx={40 + (candles.length - 1) * candleWidth + candleSpacing / 2 + actualCandleWidth / 2}
              cy={priceToY(candles[candles.length - 1].close)}
              r={isMobile ? 3 : 4}
              fill="#fbbf24"
              opacity="0.8"
            />
            <text
              x={width - (isMobile ? 5 : 10)}
              y={isMobile ? 18 : 25}
              fontSize={isMobile ? 10 : 14}
              fill="#fbbf24"
              fontWeight="bold"
              textAnchor="end"
            >
              ${isMobile ? (Math.round(candles[candles.length - 1].close) / 1000).toFixed(1) + 'k' : Math.round(candles[candles.length - 1].close).toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
