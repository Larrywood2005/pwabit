'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';

const testimonials = [
  {
    id: 1,
    name: 'George Arthur',
    role: 'Crypto Investor',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/George%20Arthur.jfif-sAiQSxPsXyTns40qymyuRFLKEgh7rO.jpeg',
    rating: 5,
    text: 'Started with just $50 and within 3 months my investment grew significantly. The platform is so easy to use and the daily returns are consistent.',
  },
  {
    id: 2,
    name: 'Johnson Crown',
    role: 'Entrepreneur',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Johnson%20Crown.jfif-7drcRBtjcahH3GA1U2iFvgGnyJkcRT.jpeg',
    rating: 5,
    text: 'Best investment decision I made this year. The security features give me peace of mind and the returns are better than any traditional investment.',
  },
  {
    id: 3,
    name: 'Ahmed Hussain',
    role: 'Business Owner',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ahmed%20Hussain.jfif-hGgubWm7i8LTidVM3IYkD1Rj7Mq8A7.jpeg',
    rating: 5,
    text: 'The team is incredibly responsive and helpful. I was hesitant at first but the KYC process was seamless and my investments have been paying off.',
  },
  {
    id: 4,
    name: 'Charlotte Amelia',
    role: 'Software Developer',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Charlotte%20Amelia.jfif-e4K3vhytEUgDvCmiikvPgLu8jt2UKX.jpeg',
    rating: 5,
    text: 'As a tech-savvy investor, I appreciate the transparent blockchain verification. The platform is solid and delivers on its promises.',
  },
];

export default function Testimonials() {
  return (
    <section className='py-20 px-4 max-w-7xl mx-auto'>
      <div className='text-center mb-16'>
        <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
          What Our Investors Say
        </h2>
        <p className='text-muted-foreground max-w-2xl mx-auto'>
          Join thousands of satisfied investors earning consistent returns on Powabitz
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className='p-6 rounded-lg bg-card border border-border hover:border-primary transition-all'
          >
            {/* Rating */}
            <div className='flex items-center gap-1 mb-3'>
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className='fill-primary text-primary'
                />
              ))}
            </div>

            {/* Testimonial Text */}
            <p className='text-foreground/90 mb-4 leading-relaxed'>
              "{testimonial.text}"
            </p>

            {/* Author */}
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/20'>
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className='w-full h-full object-cover'
                  onError={(e) => {
                    // Fallback to initials if image fails
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className='font-semibold text-foreground text-sm'>{testimonial.name}</div>
                <div className='text-muted-foreground text-xs'>{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
