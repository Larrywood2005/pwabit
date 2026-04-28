'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RegistrationSuccess() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Success Card */}
        <div className='bg-card rounded-2xl border border-border shadow-lg p-8 text-center space-y-6'>
          {/* Success Icon */}
          <div className='flex justify-center'>
            <div className='relative'>
              <div className='absolute inset-0 bg-primary/20 rounded-full blur-xl'></div>
              <div className='relative w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center'>
                <CheckCircle2 size={40} className='text-primary' />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className='space-y-2'>
            <h1 className='text-3xl font-bold text-foreground'>Welcome!</h1>
            <p className='text-muted-foreground'>Thanks for registering with Powabitz</p>
          </div>

          {/* Message */}
          <div className='space-y-4'>
            <div className='p-4 rounded-lg bg-primary/5 border border-primary/10'>
              <div className='flex items-start gap-3'>
                <Mail className='w-5 h-5 text-primary flex-shrink-0 mt-0.5' />
                <div className='text-left'>
                  <p className='font-semibold text-foreground text-sm'>Check your email</p>
                  <p className='text-muted-foreground text-xs mt-1'>
                    We&apos;ve sent you a welcome email with important information about getting started and earning your lifetime investment ROI.
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-3 text-sm text-muted-foreground'>
              <p>✓ Welcome email sent</p>
              <p>✓ Account created successfully</p>
              <p>✓ Ready to start earning</p>
            </div>
          </div>

          {/* Next Steps */}
          <div className='space-y-3 pt-4'>
            <p className='text-xs text-muted-foreground uppercase tracking-wide font-semibold'>Next Steps</p>
            <ol className='text-left space-y-2 text-sm text-muted-foreground'>
              <li className='flex gap-3'>
                <span className='text-primary font-bold flex-shrink-0'>1.</span>
                <span>Check your email for the welcome message</span>
              </li>
              <li className='flex gap-3'>
                <span className='text-primary font-bold flex-shrink-0'>2.</span>
                <span>Sign in with your credentials</span>
              </li>
              <li className='flex gap-3'>
                <span className='text-primary font-bold flex-shrink-0'>3.</span>
                <span>Complete KYC verification</span>
              </li>
              <li className='flex gap-3'>
                <span className='text-primary font-bold flex-shrink-0'>4.</span>
                <span>Start investing and earning</span>
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <Link
            href='/auth/login'
            className='w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity mt-6'
          >
            Go to Login
            <ArrowRight size={18} />
          </Link>

          {/* Footer Text */}
          <p className='text-xs text-muted-foreground'>
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <a href='mailto:support@powabitz.com' className='text-primary hover:underline'>
              contact support
            </a>
          </p>
        </div>

        {/* Additional Info */}
        <div className='mt-8 text-center space-y-4'>
          <div className='p-4 bg-card rounded-lg border border-border'>
            <p className='text-sm text-muted-foreground'>
              Questions? Check out our{' '}
              <Link href='/contact' className='text-primary hover:underline'>
                contact page
              </Link>
              {' '}or visit the{' '}
              <Link href='/' className='text-primary hover:underline'>
                help center
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
