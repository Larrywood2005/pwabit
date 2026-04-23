'use client';

import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Crypto Investor',
    image: 'SC',
    rating: 5,
    text: 'Started with just $50 and within 3 months my investment grew significantly. The platform is so easy to use and the daily returns are consistent.',
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    role: 'Entrepreneur',
    image: 'MJ',
    rating: 5,
    text: 'Best investment decision I made this year. The security features give me peace of mind and the returns are better than any traditional investment.',
  },
  {
    id: 3,
    name: 'Priya Patel',
    role: 'Business Owner',
    image: 'PP',
    rating: 5,
    text: 'The team is incredibly responsive and helpful. I was hesitant at first but the KYC process was seamless and my investments have been paying off.',
  },
  {
    id: 4,
    name: 'Ahmed Hassan',
    role: 'Software Developer',
    image: 'AH',
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
              <div className='w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0'>
                <span className='text-white text-sm font-bold'>{testimonial.image}</span>
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
