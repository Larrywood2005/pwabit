'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className='space-y-6'>
        <Link href='/auth/login' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors'>
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        <div className='text-center py-8'>
          <div className='w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4'>
            <CheckCircle className='w-8 h-8 text-green-600' />
          </div>
          <h1 className='text-2xl font-bold text-foreground mb-2'>Check Your Email</h1>
          <p className='text-muted-foreground max-w-sm mx-auto'>
            We&apos;ve sent a password reset link to <strong className='text-foreground'>{email}</strong>. 
            Please check your inbox and follow the instructions.
          </p>
        </div>

        <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
          <p className='text-sm text-blue-600'>
            <strong>Note:</strong> The reset link will expire in 24 hours. If you don&apos;t see the email, please check your spam folder.
          </p>
        </div>

        <div className='text-center space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Didn&apos;t receive the email?
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
            className='text-primary hover:text-secondary font-semibold transition-colors'
          >
            Try again with a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <Link href='/auth/login' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors'>
        <ArrowLeft size={20} />
        Back to Login
      </Link>

      <div className='text-center'>
        <div className='flex items-center justify-center gap-2 mb-4'>
          <div className='w-16 h-16 rounded-lg flex items-center justify-center'>
            <img 
              src='/powabitz-logo.svg' 
              alt='Powabitz' 
              className='w-full h-full object-contain'
            />
          </div>
        </div>
        <h1 className='text-2xl font-bold text-foreground'>Forgot Password?</h1>
        <p className='text-muted-foreground mt-2'>
          No worries! Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-start gap-2'>
          <AlertCircle size={18} className='flex-shrink-0 mt-0.5' />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-semibold text-foreground mb-2'>Email Address</label>
          <div className='relative'>
            <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='you@example.com'
            />
          </div>
        </div>

        <button
          type='submit'
          disabled={isLoading || !email}
          className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className='animate-spin' />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <div className='text-center'>
        <p className='text-muted-foreground'>
          Remember your password?{' '}
          <Link href='/auth/login' className='text-primary hover:text-secondary transition-colors font-semibold'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
