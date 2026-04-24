import Link from 'next/link';
import { ArrowRight, Shield, Zap, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageSlider from '@/components/ImageSlider';
import CryptoTicker from '@/components/CryptoTicker';
import InvestmentDisclaimer from '@/components/InvestmentDisclaimer';
import Testimonials from '@/components/Testimonials';

export default function Home() {
  return (
    <main className='min-h-screen bg-background'>
      <Header />

      {/* Hero Section */}
      <section className='pt-32 pb-16 px-4 max-w-7xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-12 items-center'>
          {/* Left Content */}
          <div className='flex flex-col gap-6'>
            <div>
              <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 text-balance'>
                Grow Your Crypto{' '}
                <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                  3% Daily
                </span>
              </h1>
              <p className='text-lg text-muted-foreground max-w-xl text-balance'>
                Start investing with just $10 and earn guaranteed daily compound returns. Secure,
                transparent, and designed for everyone.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row gap-4'>
              <Link
                href='/auth/register'
                className='px-8 py-4 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group'
              >
                Start Investing Now
                <ArrowRight className='group-hover:translate-x-1 transition-transform' size={20} />
              </Link>
              <Link
                href='/about'
                className='px-8 py-4 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center'
              >
                Learn More
              </Link>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-3 gap-4 pt-8'>
              <div className='flex flex-col gap-1'>
                <div className='text-2xl font-bold text-primary'>$20M+</div>
                <div className='text-sm text-muted-foreground'>Total Invested</div>
              </div>
              <div className='flex flex-col gap-1'>
                <div className='text-2xl font-bold text-secondary'>5K+</div>
                <div className='text-sm text-muted-foreground'>Active Investors</div>
              </div>
              <div className='flex flex-col gap-1'>
                <div className='text-2xl font-bold text-accent'>3%</div>
                <div className='text-sm text-muted-foreground'>Daily Returns</div>
              </div>
            </div>
          </div>

          {/* Right - Image Slider */}
          <ImageSlider />
        </div>
      </section>

      {/* Crypto Ticker Section */}
      <section className='py-12 px-4 bg-card/50'>
        <div className='max-w-7xl mx-auto'>
          <h2 className='text-2xl font-bold text-foreground mb-8 text-center'>
            Live Crypto Prices
          </h2>
          <CryptoTicker />
        </div>
      </section>

      {/* Features Section */}
      <section className='py-20 px-4 max-w-7xl mx-auto'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
            Why Choose Powabitz?
          </h2>
          <p className='text-muted-foreground max-w-2xl mx-auto'>
            We provide a secure, transparent, and user-friendly platform for crypto investments with
            guaranteed daily returns.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {/* Feature 1 */}
          <div className='p-8 rounded-lg bg-card border border-border hover:border-primary transition-all group'>
            <div className='w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
              <Zap className='text-white' size={24} />
            </div>
            <h3 className='text-xl font-bold text-foreground mb-2'>Daily Compound Returns</h3>
            <p className='text-muted-foreground'>
              Earn guaranteed 3% daily returns that automatically compound with your existing
              investments.
            </p>
          </div>

          {/* Feature 2 */}
          <div className='p-8 rounded-lg bg-card border border-border hover:border-secondary transition-all group'>
            <div className='w-12 h-12 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
              <Shield className='text-white' size={24} />
            </div>
            <h3 className='text-xl font-bold text-foreground mb-2'>Secure & Transparent</h3>
            <p className='text-muted-foreground'>
              All transactions verified on blockchain. Full KYC verification for accounts above
              $300.
            </p>
          </div>

          {/* Feature 3 */}
          <div className='p-8 rounded-lg bg-card border border-border hover:border-accent transition-all group'>
            <div className='w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
              <TrendingUp className='text-white' size={24} />
            </div>
            <h3 className='text-xl font-bold text-foreground mb-2'>Low Minimum Investment</h3>
            <p className='text-muted-foreground'>
              Start with just $10 and grow your wealth. No hidden fees or minimum lock-in period.
            </p>
          </div>
        </div>
      </section>

      {/* AI Trading Automation Section */}
      <section className='py-24 px-4 max-w-7xl mx-auto'>
        <div className='relative rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border-2 border-primary/30 overflow-hidden'>
          {/* Animated background elements */}
          <div className='absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl bg-primary/10 -mr-48 -mt-48'></div>
          <div className='absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl bg-secondary/10 -ml-48 -mb-48'></div>

          <div className='relative p-12 md:p-20'>
            <div className='max-w-3xl mx-auto text-center'>
              <div className='inline-block px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-6'>
                <span className='text-primary font-semibold text-sm'>AUTOMATED TRADING</span>
              </div>
              
              <h2 className='text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance'>
                Our Robot Trades For You While You Sleep
              </h2>
              
              <p className='text-lg text-muted-foreground mb-8 text-balance'>
                24/7 AI-powered trading algorithms work around the clock to optimize your investments and maximize returns, even while you rest.
              </p>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
                <div className='p-4 rounded-lg bg-background/50 border border-border'>
                  <div className='text-2xl font-bold text-primary mb-2'>24/7</div>
                  <p className='text-sm text-muted-foreground'>Continuous Trading</p>
                </div>
                <div className='p-4 rounded-lg bg-background/50 border border-border'>
                  <div className='text-2xl font-bold text-secondary mb-2'>AI Powered</div>
                  <p className='text-sm text-muted-foreground'>Smart Algorithms</p>
                </div>
                <div className='p-4 rounded-lg bg-background/50 border border-border'>
                  <div className='text-2xl font-bold text-accent mb-2'>99% Safe</div>
                  <p className='text-sm text-muted-foreground'>Secure & Monitored</p>
                </div>
              </div>

              <Link
                href='/investment'
                className='inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all'
              >
                Start Automated Trading
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Packages Preview */}
      <section className='py-20 px-4 bg-card/50 max-w-7xl mx-auto'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
            Investment Packages
          </h2>
          <p className='text-muted-foreground max-w-2xl mx-auto'>
            Choose the package that fits your investment goals
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {/* Starter */}
          <div className='p-8 rounded-lg border border-border hover:border-primary transition-all flex flex-col h-full'>
            <div>
              <div className='text-sm font-semibold text-primary mb-2'>STARTER</div>
              <h3 className='text-2xl font-bold text-foreground mb-2'>$10 - $999</h3>
              <p className='text-muted-foreground mb-6'>Perfect for beginners</p>
            </div>
            <div className='space-y-3 mb-8 flex-grow'>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-primary'></div>
                3% Daily Returns
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-primary'></div>
                Daily Compound
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-primary'></div>
                24h Trading
              </div>
            </div>
            <Link
              href='/investment'
              className='w-full py-2 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-center font-semibold'
            >
              Get Started
            </Link>
          </div>

          {/* Premium */}
          <div className='p-8 rounded-lg border-2 border-secondary bg-gradient-to-br from-secondary/10 to-transparent relative flex flex-col h-full'>
            <div className='absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold rounded-full'>
              POPULAR
            </div>
            <div>
              <div className='text-sm font-semibold text-secondary mb-2'>PREMIUM</div>
              <h3 className='text-2xl font-bold text-foreground mb-2'>$1,000 - $4,999</h3>
              <p className='text-muted-foreground mb-6'>Best for serious investors</p>
            </div>
            <div className='space-y-3 mb-8 flex-grow'>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-secondary'></div>
                3% Daily Returns
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-secondary'></div>
                Daily Compound
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-secondary'></div>
                24h Trading
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-secondary'></div>
                Priority Support
              </div>
            </div>
            <Link
              href='/investment'
              className='w-full py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all text-center'
            >
              Get Started
            </Link>
          </div>

          {/* Elite */}
          <div className='p-8 rounded-lg border border-border hover:border-accent transition-all flex flex-col h-full'>
            <div>
              <div className='text-sm font-semibold text-accent mb-2'>ELITE</div>
              <h3 className='text-2xl font-bold text-foreground mb-2'>$5,000+</h3>
              <p className='text-muted-foreground mb-6'>For professional traders</p>
            </div>
            <div className='space-y-3 mb-8 flex-grow'>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-accent'></div>
                3% Daily Returns
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-accent'></div>
                Daily Compound
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-accent'></div>
                24h Trading
              </div>
              <div className='flex items-center gap-2 text-foreground'>
                <div className='w-1.5 h-1.5 rounded-full bg-accent'></div>
                VIP Support
              </div>
            </div>
            <Link
              href='/investment'
              className='w-full py-2 rounded-lg border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors text-center font-semibold'
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Investment Disclaimer Section */}
      <section className='py-12 px-4 max-w-7xl mx-auto'>
        <InvestmentDisclaimer />
      </section>

      {/* CTA Section */}
      <section className='py-16 px-4 max-w-7xl mx-auto'>
        <div className='p-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-center'>
          <h2 className='text-3xl md:text-4xl font-bold text-primary-foreground mb-4'>
            Ready to Start Your Investment Journey?
          </h2>
          <p className='text-primary-foreground/90 mb-8 max-w-2xl mx-auto'>
            Join thousands of investors earning daily crypto returns. Sign up in minutes and start
            growing your wealth today.
          </p>
          <Link
            href='/auth/register'
            className='inline-block px-10 py-4 rounded-lg bg-primary-foreground text-primary font-bold hover:shadow-lg transition-all'
          >
            Sign Up Now
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
