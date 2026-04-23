'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.resetPassword(token, formData.password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className='space-y-6'>
        <Link href='/auth/login' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors'>
          <ArrowLeft size={20} />
          Back to Login
        </Link>

        <div className='text-center py-8'>
          <div className='w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4'>
            <AlertCircle className='w-8 h-8 text-red-600' />
          </div>
          <h1 className='text-2xl font-bold text-foreground mb-2'>Invalid Reset Link</h1>
          <p className='text-muted-foreground max-w-sm mx-auto'>
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <div className='text-center'>
          <Link 
            href='/auth/forgot-password' 
            className='px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all inline-block'
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className='space-y-6'>
        <div className='text-center py-8'>
          <div className='w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4'>
            <CheckCircle className='w-8 h-8 text-green-600' />
          </div>
          <h1 className='text-2xl font-bold text-foreground mb-2'>Password Reset Successful</h1>
          <p className='text-muted-foreground max-w-sm mx-auto'>
            Your password has been successfully reset. You will be redirected to the login page shortly.
          </p>
        </div>

        <div className='text-center'>
          <Link 
            href='/auth/login' 
            className='text-primary hover:text-secondary font-semibold transition-colors'
          >
            Go to Login Now
          </Link>
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
        <h1 className='text-2xl font-bold text-foreground'>Reset Your Password</h1>
        <p className='text-muted-foreground mt-2'>
          Enter your new password below
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
          <label className='block text-sm font-semibold text-foreground mb-2'>New Password</label>
          <div className='relative'>
            <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              name='password'
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className='w-full pl-10 pr-10 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='Enter new password'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className='text-xs text-muted-foreground mt-1'>Must be at least 8 characters</p>
        </div>

        <div>
          <label className='block text-sm font-semibold text-foreground mb-2'>Confirm Password</label>
          <div className='relative'>
            <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8}
              className='w-full pl-10 pr-10 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='Confirm new password'
            />
            <button
              type='button'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type='submit'
          disabled={isLoading || !formData.password || !formData.confirmPassword}
          className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className='animate-spin' />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className='flex items-center justify-center min-h-[300px]'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
