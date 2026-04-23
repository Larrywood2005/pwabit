'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    title: 'Invest & Grow Your Crypto',
    description: 'Start your crypto investment journey with advanced AI-powered trading',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/robots-2-v4Rn6gp6YzgWo0Bk6AUn8EkQO6O6O6.jpg',
    gradient: 'from-primary to-secondary',
  },
  {
    title: 'Secure & Protected',
    description: 'Your investments are fully secured with enterprise-grade security',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/secure-finance-illustration.png-7MVezOylAXOVeVVKuRAZseYwCjETpJ.jpeg',
    gradient: 'from-secondary to-accent',
  },
  {
    title: 'Real-time Trading',
    description: 'Advanced technology for real-time crypto trading and monitoring',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/digital-trading-technology-wz48GezgwAd4ikxkb2ANPblJSZHVDT.webp',
    gradient: 'from-accent to-primary',
  },
  {
    title: 'AI-Powered Trading',
    description: 'Automated trading with cutting-edge AI algorithms for maximum returns',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ai-trading-robot-hsNkzYCZyJJKMJiNFaY2jZ36k3SH04.jpg',
    gradient: 'from-primary via-secondary to-accent',
  },
];

export default function ImageSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className='relative w-full h-96 rounded-xl overflow-hidden'>
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image with Overlay */}
          <div 
            className='w-full h-full relative bg-cover bg-center'
            style={{
              backgroundImage: `url('${slide.image}')`,
            }}
          >
            {/* Dark Overlay */}
            <div className='absolute inset-0 bg-black/50'></div>

            {/* Content */}
            <div className='relative h-full flex flex-col items-center justify-center text-center px-6'>
              <h2 className='text-3xl md:text-4xl font-bold text-white mb-4 text-balance'>
                {slide.title}
              </h2>
              <p className='text-white/90 text-lg max-w-md text-balance'>
                {slide.description}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur transition-all'
      >
        <ChevronLeft className='text-white' size={24} />
      </button>
      <button
        onClick={nextSlide}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur transition-all'
      >
        <ChevronRight className='text-white' size={24} />
      </button>

      {/* Dots */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2'>
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
