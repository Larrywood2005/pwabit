'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InvestmentDisclaimer from '@/components/InvestmentDisclaimer';

export default function InvestmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const packages = [
    {
      id: 'starter',
      name: 'Starter Package',
      min: 10,
      max: 999,
      dailyReturn: 10,
      features: [
        '10% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'Basic support',
        'KYC for deposits > $300',
        'Real-time updates'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Package',
      min: 1000,
      max: 4999,
      dailyReturn: 10,
      popular: true,
      features: [
        '10% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'Priority support',
        'KYC verification required',
        'Real-time updates',
        'Portfolio analytics',
        'Advanced trading tools'
      ]
    },
    {
      id: 'elite',
      name: 'Elite Package',
      min: 5000,
      max: null,
      dailyReturn: 10,
      features: [
        '10% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'VIP support 24/7',
        'Advanced KYC tier',
        'Real-time updates',
        'Premium analytics',
        'White-glove service',
        'Custom strategies'
      ]
    }
  ];

  return (
    <main className='min-h-screen bg-background'>
      <Header />

      {/* Hero */}
      <section className='pt-32 pb-12 px-4 max-w-7xl mx-auto'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl md:text-5xl font-bold text-foreground mb-4'>
            Choose Your Investment Package
          </h1>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            Select the package that best suits your investment goals and start earning daily returns.
          </p>
        </div>
      </section>

      {/* Packages Grid */}
      <section className='py-12 px-4 max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-xl transition-all flex flex-col h-full ${
                pkg.popular
                  ? 'border-2 border-secondary bg-gradient-to-br from-secondary/10 to-transparent'
                  : 'border border-border hover:border-primary'
              }`}
            >
              {pkg.popular && (
                <div className='absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-full'>
                  MOST POPULAR
                </div>
              )}

              <div className='p-8 flex flex-col h-full'>
                {/* Header Section - Fixed at top */}
                <div>
                  <h2 className='text-2xl font-bold text-foreground mb-2'>{pkg.name}</h2>
                  <div className='mb-6'>
                    <div className='text-4xl font-bold text-primary mb-2'>
                      ${pkg.min}
                      <span className='text-lg text-muted-foreground ml-2'>
                        {pkg.max ? `- $${pkg.max}` : '+'}
                      </span>
                    </div>
                    <div className='text-green-500 font-semibold'>{pkg.dailyReturn}% Daily Returns</div>
                  </div>
                </div>

                {/* Features Section - Flexible growth */}
                <div className='space-y-3 mb-8 flex-grow'>
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className='flex items-start gap-3'>
                      <CheckCircle className='text-primary mt-0.5 flex-shrink-0' size={20} />
                      <span className='text-foreground text-sm'>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Button Section - Fixed at bottom */}
                <button
                  onClick={() => {
                    if (user) {
                      router.push('/dashboard/investment/new');
                    } else {
                      router.push('/auth/register');
                    }
                  }}
                  className={`w-full py-3 rounded-lg font-semibold transition-all text-center ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                      : 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                  }`}
                >
                  Invest Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Investment Disclaimer */}
      <section className='py-12 px-4 max-w-7xl mx-auto'>
        <InvestmentDisclaimer />
      </section>

      {/* How It Works */}
      <section className='py-20 px-4 bg-card/50 max-w-7xl mx-auto'>
        <h2 className='text-3xl font-bold text-foreground mb-12 text-center'>How It Works</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {[
            { step: 1, title: 'Sign Up', desc: 'Create your account with email verification' },
            { step: 2, title: 'Invest', desc: 'Select a package and send crypto to our wallet' },
            { step: 3, title: 'Earn', desc: 'Get 10% daily returns automatically credited' },
            { step: 4, title: 'Withdraw', desc: 'Withdraw your earnings anytime' }
          ].map((item) => (
            <div key={item.step} className='flex flex-col items-center text-center'>
              <div className='w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg mb-4'>
                {item.step}
              </div>
              <h3 className='text-xl font-bold text-foreground mb-2'>{item.title}</h3>
              <p className='text-muted-foreground'>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className='py-20 px-4 max-w-3xl mx-auto'>
        <h2 className='text-3xl font-bold text-foreground mb-12 text-center'>FAQs</h2>
        
        <div className='space-y-6'>
          {[
            {
              q: 'Is my investment safe?',
              a: 'Yes, all transactions are verified on blockchain and we maintain strict security protocols with 24/7 monitoring.'
            },
            {
              q: 'Can I withdraw anytime?',
              a: 'Yes, you can request withdrawals anytime after your initial investment is activated. Payouts are processed within 24-48 hours.'
            },
            {
              q: 'What happens after 24 hours?',
              a: 'After 24 hours from activation, you can place trades and adjust your investment strategy.'
            },
            {
              q: 'Are there hidden fees?',
              a: 'No hidden fees. We only charge a small network transaction fee for withdrawals.'
            }
          ].map((item, idx) => (
            <div key={idx} className='p-6 rounded-lg border border-border'>
              <h3 className='font-bold text-foreground mb-2'>{item.q}</h3>
              <p className='text-muted-foreground'>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
