'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface AdvancedCandlestickChartProps {
  width?: number;
  height?: number;
  isAnimating?: boolean;
  initialCandles?: Candle[];
}

export default function AdvancedCandlestickChart({
  width: propWidth,
  height: propHeight,
  isAnimating = false,
  initialCandles = []
}: AdvancedCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 400, height: propHeight || 250 });
  const [candles, setCandles] = useState<Candle[]>(initialCandles.length > 0 ? initialCandles : generateInitialCandles());

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
  
  function generateInitialCandles(): Candle[] {
    const result: Candle[] = [];
    let currentPrice = 45000;
    
    for (let i = 0; i < 50; i++) {
      const volatility = Math.random() * 1000 - 500;
      const open = currentPrice;
      const close = currentPrice + volatility;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      
      result.push({
        time: i,
        open,
        high,
        low,
        close
      });
      
      currentPrice = close;
    }
    
    return result;
  }
  
  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(() => {
      setCandles(prev => {
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        
        // Update last candle with random movement
        const randomChange = Math.random() * 200 - 100;
        const newClose = lastCandle.close + randomChange;
        
        newCandles[newCandles.length - 1] = {
          ...lastCandle,
          close: newClose,
          high: Math.max(lastCandle.high, newClose),
          low: Math.min(lastCandle.low, newClose)
        };
        
        // 30% chance to start new candle
        if (Math.random() < 0.3) {
          newCandles.push({
            time: newCandles.length,
            open: newClose,
            high: newClose,
            low: newClose,
            close: newClose
          });
        }
        
        // Keep only last 50 candles
        return newCandles.slice(-50);
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isAnimating]);
  
  // Calculate scale
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice;
  
  // Responsive padding based on screen size
  const isMobileView = width < 400;
  const padding = { 
    top: isMobileView ? 25 : 40, 
    right: isMobileView ? 15 : 40, 
    bottom: isMobileView ? 25 : 40, 
    left: isMobileView ? 35 : 60 
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const candleWidth = Math.max(2, Math.min(8, chartWidth / candles.length - 1));
  const spacing = chartWidth / candles.length;
  
  const priceToY = (price: number) => {
    return padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const y = padding.top + ratio * chartHeight;
        const price = minPrice + (1 - ratio) * priceRange;
        
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth="1"
              strokeDasharray={isMobileView ? "3,3" : "5,5"}
            />
            <text
              x={padding.left - 5}
              y={y + 3}
              textAnchor="end"
              fontSize={isMobileView ? 8 : 12}
              fill="rgba(148, 163, 184, 0.6)"
            >
              ${(price / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      
      {/* Candlesticks */}
      {candles.map((candle, idx) => {
        const x = padding.left + (idx / (candles.length - 1)) * chartWidth;
        const openY = priceToY(candle.open);
        const closeY = priceToY(candle.close);
        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);
        
        const isGreen = candle.close >= candle.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyBottom = Math.max(openY, closeY);
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        
        const wickColor = isGreen ? '#10b981' : '#ef4444';
        const bodyColor = isGreen ? '#10b98166' : '#ef444466';
        const bodyStroke = isGreen ? '#10b981' : '#ef4444';
        
        return (
          <g key={idx}>
            {/* Wick */}
            <line
              x1={x}
              y1={highY}
              x2={x}
              y2={lowY}
              stroke={wickColor}
              strokeWidth="1"
              opacity="0.7"
            />
            
            {/* Body */}
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={bodyColor}
              stroke={bodyStroke}
              strokeWidth="1"
            />
          </g>
        );
      })}
      
      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="rgba(148, 163, 184, 0.3)"
        strokeWidth="2"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="rgba(148, 163, 184, 0.3)"
        strokeWidth="2"
      />
      
      {/* Current price indicator */}
      {candles.length > 0 && (
        <g>
          <circle
            cx={padding.left + chartWidth}
            cy={priceToY(candles[candles.length - 1].close)}
            r={isMobileView ? 3 : 4}
            fill="#3b82f6"
          />
          <text
            x={width - padding.right - 5}
            y={priceToY(candles[candles.length - 1].close) - 8}
            textAnchor="end"
            fontSize={isMobileView ? 9 : 12}
            fontWeight="bold"
            fill="#3b82f6"
          >
            ${candles[candles.length - 1].close.toFixed(0)}
          </text>
        </g>
      )}
      </svg>
    </div>
  );
}
