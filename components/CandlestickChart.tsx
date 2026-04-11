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

  // Responsive dimensions based on container size - Mobile First
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Mobile-first responsive sizing with better breakpoints
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const isMobile = screenWidth < 480;
        const isSmallMobile = screenWidth < 380;
        const isTablet = screenWidth >= 480 && screenWidth < 768;
        const isDesktop = screenWidth >= 768;
        
        let chartWidth = propWidth || containerWidth || 400;
        let chartHeight;
        
        if (isSmallMobile) {
          chartHeight = propHeight || 160;
        } else if (isMobile) {
          chartHeight = propHeight || 180;
        } else if (isTablet) {
          chartHeight = propHeight || 220;
        } else {
          chartHeight = propHeight || 300;
        }
        
        // Constrain to container width
        chartWidth = Math.min(chartWidth, containerWidth || 800);
        
        setDimensions({ width: chartWidth, height: chartHeight });
      }
    };

    updateDimensions();
    
    // Use ResizeObserver for better responsiveness
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [propWidth, propHeight]);

  const { width, height } = dimensions;
  
  // Generate realistic mock candlestick data
  useEffect(() => {
    const generateCandles = () => {
      const newCandles: Candle[] = [];
      let basePrice = 35000;
      
      // Fewer candles on mobile for better visibility
      const candleCount = width < 400 ? 15 : 20;
      
      for (let i = 0; i < candleCount; i++) {
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
  }, [width]);
  
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
        
        const maxCandles = width < 400 ? 14 : 19;
        return [...prev.slice(-maxCandles), newCandle];
      });
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [isTrading, animated, width]);
  
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
  
  // Canvas dimensions - adjusted for mobile
  const isMobile = width < 400;
  const isSmallMobile = width < 350;
  const leftPadding = isSmallMobile ? 25 : isMobile ? 35 : 50;
  const rightPadding = isSmallMobile ? 5 : isMobile ? 10 : 15;
  const topPadding = isSmallMobile ? 12 : isMobile ? 15 : 20;
  const bottomPadding = isSmallMobile ? 25 : isMobile ? 30 : 40;
  
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  
  const candleWidth = chartWidth / candles.length;
  const candleSpacing = candleWidth * 0.2;
  const actualCandleWidth = Math.max(2, candleWidth - candleSpacing);
  
  const priceToY = (price: number) => {
    return topPadding + ((chartMaxPrice - price) / chartPriceRange) * chartHeight;
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (isSmallMobile) {
      return (price / 1000).toFixed(0) + 'k';
    }
    if (isMobile) {
      return (price / 1000).toFixed(1) + 'k';
    }
    return Math.round(price).toLocaleString();
  };

  return (
    <div 
      ref={containerRef} 
      className="relative bg-muted rounded-lg overflow-hidden w-full touch-pan-x touch-pan-y" 
      style={{ height, minHeight: isSmallMobile ? 140 : isMobile ? 160 : 200 }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 100%)' }}
      >
        {/* Vertical grid lines - fewer on mobile */}
        {candles.filter((_, i) => isMobile ? i % 3 === 0 : i % 2 === 0).map((_, idx) => {
          const i = isMobile ? idx * 3 : idx * 2;
          if (i >= candles.length) return null;
          return (
            <line
              key={`vgrid-${i}`}
              x1={leftPadding + (i + 0.5) * candleWidth}
              y1={topPadding}
              x2={leftPadding + (i + 0.5) * candleWidth}
              y2={height - bottomPadding}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Horizontal grid lines */}
        {[0, 1, 2, 3].map((_, i) => {
          const y = topPadding + (i / 3) * chartHeight;
          const price = chartMaxPrice - (i / 3) * chartPriceRange;
          
          return (
            <g key={`hgrid-${i}`}>
              <line
                x1={leftPadding}
                y1={y}
                x2={width - rightPadding}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={isSmallMobile ? 3 : isMobile ? 5 : 8}
                y={y + 3}
                fontSize={isSmallMobile ? 7 : isMobile ? 8 : 11}
                fill="rgba(255,255,255,0.6)"
                textAnchor="start"
              >
                ${formatPrice(price)}
              </text>
            </g>
          );
        })}
        
        {/* Candlesticks */}
        {candles.map((candle, i) => {
          const x = leftPadding + i * candleWidth + candleSpacing / 2;
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
                strokeWidth={isSmallMobile ? 0.5 : 1}
              />
              
              {/* Body */}
              <rect
                x={x}
                y={bodyTop}
                width={actualCandleWidth}
                height={bodyHeight}
                fill={isGreen ? '#10b981' : '#ef4444'}
                stroke={isGreen ? '#059669' : '#dc2626'}
                strokeWidth={isSmallMobile ? 0.3 : 0.5}
                opacity={isTrading && i === candles.length - 1 ? 0.8 : 1}
              />
            </g>
          );
        })}
        
        {/* Current price indicator */}
        {isTrading && candles.length > 0 && (
          <g>
            {/* Pulsing dot on latest candle */}
            <circle
              cx={leftPadding + (candles.length - 1) * candleWidth + candleSpacing / 2 + actualCandleWidth / 2}
              cy={priceToY(candles[candles.length - 1].close)}
              r={isSmallMobile ? 2 : isMobile ? 3 : 4}
              fill="#fbbf24"
              opacity="0.9"
            >
              <animate
                attributeName="r"
                values={isSmallMobile ? "2;4;2" : isMobile ? "3;5;3" : "4;6;4"}
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.5;0.9"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            
            {/* Current price label */}
            <rect
              x={width - (isSmallMobile ? 40 : isMobile ? 50 : 70)}
              y={isSmallMobile ? 3 : isMobile ? 5 : 8}
              width={isSmallMobile ? 36 : isMobile ? 45 : 62}
              height={isSmallMobile ? 14 : isMobile ? 16 : 20}
              rx="3"
              fill="rgba(251, 191, 36, 0.2)"
              stroke="#fbbf24"
              strokeWidth="1"
            />
            <text
              x={width - (isSmallMobile ? 22 : isMobile ? 27 : 39)}
              y={isSmallMobile ? 13 : isMobile ? 16 : 21}
              fontSize={isSmallMobile ? 8 : isMobile ? 9 : 12}
              fill="#fbbf24"
              fontWeight="bold"
              textAnchor="middle"
            >
              ${formatPrice(candles[candles.length - 1].close)}
            </text>
          </g>
        )}
        
        {/* Chart title/label */}
        <text
          x={leftPadding + 5}
          y={isSmallMobile ? 10 : isMobile ? 12 : 16}
          fontSize={isSmallMobile ? 8 : isMobile ? 9 : 11}
          fill="rgba(255,255,255,0.4)"
        >
          {isTrading ? 'LIVE' : 'BTC/USD'}
        </text>
        
        {/* Live indicator */}
        {isTrading && (
          <g>
            <circle
              cx={leftPadding + (isSmallMobile ? 30 : isMobile ? 35 : 45)}
              cy={isSmallMobile ? 7 : isMobile ? 9 : 12}
              r={isSmallMobile ? 2 : 3}
              fill="#10b981"
            >
              <animate
                attributeName="opacity"
                values="1;0.3;1"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}
