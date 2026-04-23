'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface Partner {
  name: string;
  logo: string;
  alt: string;
}

const partners: Partner[] = [
  {
    name: 'Bitget',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bitget.jfif-inO9CN9hFSAssd7wNNgRBGsvIlmaPA.jpeg',
    alt: 'Bitget'
  },
  {
    name: 'Trust Wallet',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Trust-Wallet-New-Logo-Pbgic9FiPMILg5GH70KHLqauq5tQlg.png',
    alt: 'Trust Wallet'
  },
  {
    name: 'Binance',
    logo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Binance-Logo.wine-RUG3Ne88Y6erD3PcBlO42YcUxZ4hA3.png',
    alt: 'Binance'
  }
];

export default function PartnersCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Marquee-style continuous scrolling at consistent speed
    let scrollPosition = 0;
    const scrollSpeed = 1; // pixels per frame (faster marquee effect)

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Reset when we reach the end (halfway through duplicated content)
      const maxScroll = container.scrollWidth / 2;
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
      }
      
      container.scrollLeft = scrollPosition;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className='w-full'>
      <div className='text-center mb-6'>
        <h3 className='text-base font-semibold text-foreground mb-1'>Our Partners</h3>
        <p className='text-xs text-muted-foreground'>
          Trusted by leading crypto platforms worldwide
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        className='flex gap-6 overflow-x-hidden scroll-smooth pb-2'
        style={{
          scrollBehavior: 'auto'
        }}
      >
        {/* Duplicate partners for infinite marquee effect */}
        {[...partners, ...partners, ...partners].map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className='flex-shrink-0 h-16 w-28 md:w-32 flex items-center justify-center bg-card/30 rounded-lg border border-border/50 transition-all duration-300 p-3'
          >
            <div className='relative w-full h-full flex items-center justify-center'>
              <Image
                src={partner.logo}
                alt={partner.alt}
                fill
                className='object-contain'
                sizes='(max-width: 768px) 112px, 128px'
                priority
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
