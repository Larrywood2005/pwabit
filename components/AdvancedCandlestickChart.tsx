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

  // Responsive dimensions based on container size - Mobile First
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Mobile-first responsive sizing with better breakpoints
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const isSmallMobile = screenWidth < 380;
        const isMobile = screenWidth < 480;
        const isTablet = screenWidth >= 480 && screenWidth < 768;
        
        let chartWidth = propWidth || containerWidth || 400;
        let chartHeight;
        
        if (isSmallMobile) {
          chartHeight = propHeight || 150;
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
  
  function generateInitialCandles(): Candle[] {
    const result: Candle[] = [];
    let currentPrice = 45000;
    
    // Fewer candles on mobile for better visibility
    const candleCount = width < 400 ? 30 : 50;
    
    for (let i = 0; i < candleCount; i++) {
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
        
        // Keep fewer candles on mobile
        const maxCandles = width < 400 ? 30 : 50;
        return newCandles.slice(-maxCandles);
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isAnimating, width]);
  
  // Guard against empty candles array
  if (candles.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="w-full bg-slate-800 rounded-lg flex items-center justify-center"
        style={{ height: dimensions.height, minHeight: 150 }}
      >
        <p className="text-slate-400 text-sm">Loading chart...</p>
      </div>
    );
  }
  
  // Calculate scale
  const allPrices = candles.flatMap((candleData) => [candleData.high, candleData.low]);
  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  
  // Responsive padding based on screen size
  const isSmallMobile = width < 350;
  const isMobileView = width < 400;
  const padding = { 
    top: isSmallMobile ? 15 : isMobileView ? 20 : 35, 
    right: isSmallMobile ? 8 : isMobileView ? 12 : 35, 
    bottom: isSmallMobile ? 15 : isMobileView ? 20 : 35, 
    left: isSmallMobile ? 28 : isMobileView ? 35 : 55 
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const candleWidth = Math.max(1.5, Math.min(isSmallMobile ? 4 : isMobileView ? 5 : 8, chartWidth / candles.length - 1));
  const spacing = chartWidth / candles.length;
  
  const priceToY = (price: number) => {
    return padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };
  
  // Format price for display
  const formatPrice = (price: number) => {
    if (isSmallMobile) {
      return (price / 1000).toFixed(0) + 'k';
    }
    return (price / 1000).toFixed(isMobileView ? 0 : 1) + 'k';
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full overflow-hidden touch-pan-x touch-pan-y"
      style={{ minHeight: isSmallMobile ? 130 : isMobileView ? 150 : 200 }}
    >
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      >
        {/* Grid lines - fewer on mobile */}
        {[0, 0.5, 1].map((ratio, gridIndex) => {
          const y = padding.top + ratio * chartHeight;
          const price = minPrice + (1 - ratio) * priceRange;
          
          return (
            <g key={gridIndex}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(148, 163, 184, 0.1)"
                strokeWidth="1"
                strokeDasharray={isSmallMobile ? "2,2" : isMobileView ? "3,3" : "5,5"}
              />
              <text
                x={padding.left - 3}
                y={y + 3}
                textAnchor="end"
                fontSize={isSmallMobile ? 7 : isMobileView ? 8 : 11}
                fill="rgba(148, 163, 184, 0.6)"
              >
                ${formatPrice(price)}
              </text>
            </g>
          );
        })}
        
        {/* Candlesticks */}
        {candles && candles.length > 0 && candles.map((candleData, candleIdx) => {
          const candleX = padding.left + (candleIdx / (candles.length - 1)) * chartWidth;
          const openY = priceToY(candleData.open);
          const closeY = priceToY(candleData.close);
          const highY = priceToY(candleData.high);
          const lowY = priceToY(candleData.low);
          
          const isGreen = candleData.close >= candleData.open;
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          
          const wickColor = isGreen ? '#10b981' : '#ef4444';
          const bodyColor = isGreen ? '#10b98166' : '#ef444466';
          const bodyStroke = isGreen ? '#10b981' : '#ef4444';
          
          return (
            <g key={candleIdx}>
              {/* Wick */}
              <line
                x1={candleX}
                y1={highY}
                x2={candleX}
                y2={lowY}
                stroke={wickColor}
                strokeWidth={isSmallMobile ? 0.5 : 1}
                opacity="0.7"
              />
              
              {/* Body */}
              <rect
                x={candleX - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={bodyColor}
                stroke={bodyStroke}
                strokeWidth={isSmallMobile ? 0.3 : 0.5}
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
          strokeWidth={isSmallMobile ? 1 : 2}
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth={isSmallMobile ? 1 : 2}
        />
        
        {/* Current price indicator */}
        {candles && candles.length > 0 && (
          <g>
            {/* Pulsing dot */}
            <circle
              cx={padding.left + chartWidth}
              cy={priceToY(candles[candles.length - 1].close)}
              r={isSmallMobile ? 2 : isMobileView ? 3 : 4}
              fill="#3b82f6"
            >
              {isAnimating && (
                <>
                  <animate
                    attributeName="r"
                    values={isSmallMobile ? "2;3;2" : isMobileView ? "3;4;3" : "4;6;4"}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </circle>
            
            {/* Price label */}
            <rect
              x={width - padding.right - (isSmallMobile ? 35 : isMobileView ? 42 : 55)}
              y={isSmallMobile ? 3 : isMobileView ? 5 : 8}
              width={isSmallMobile ? 32 : isMobileView ? 38 : 50}
              height={isSmallMobile ? 12 : isMobileView ? 14 : 18}
              rx="3"
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth="0.5"
            />
            <text
              x={width - padding.right - (isSmallMobile ? 19 : isMobileView ? 23 : 30)}
              y={isSmallMobile ? 11 : isMobileView ? 14 : 20}
              textAnchor="middle"
              fontSize={isSmallMobile ? 7 : isMobileView ? 8 : 11}
              fontWeight="bold"
              fill="#3b82f6"
            >
              ${formatPrice(candles[candles.length - 1].close)}
            </text>
          </g>
        )}
        
        {/* Live indicator for trading */}
        {isAnimating && (
          <g>
            <text
              x={padding.left + 5}
              y={isSmallMobile ? 10 : isMobileView ? 12 : 18}
              fontSize={isSmallMobile ? 7 : isMobileView ? 8 : 10}
              fill="rgba(255,255,255,0.4)"
            >
              LIVE
            </text>
            <circle
              cx={padding.left + (isSmallMobile ? 25 : isMobileView ? 28 : 35)}
              cy={isSmallMobile ? 7 : isMobileView ? 9 : 14}
              r={isSmallMobile ? 2 : 2.5}
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
