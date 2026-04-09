'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { userLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await userLogin(formData.email, formData.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Back Button */}
      <Link href='/' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-4'>
        <ArrowLeft size={20} />
        Back to Home
      </Link>

      {/* Header */}
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
        <h1 className='text-2xl font-bold text-foreground'>Welcome Back</h1>
        <p className='text-muted-foreground mt-2'>Sign in to your account</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Email */}
        <div>
          <label className='block text-sm font-semibold text-foreground mb-2'>Email Address</label>
          <div className='relative'>
            <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              required
              className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='you@example.com'
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className='flex items-center justify-between mb-2'>
            <label className='block text-sm font-semibold text-foreground'>Password</label>
            <Link href='/auth/forgot-password' className='text-xs text-primary hover:text-secondary transition-colors'>
              Forgot?
            </Link>
          </div>
          <div className='relative'>
            <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              name='password'
              value={formData.password}
              onChange={handleChange}
              required
              className='w-full pl-10 pr-10 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='••••••••'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className='flex items-center gap-4'>
        <div className='flex-1 h-px bg-border'></div>
        <span className='text-xs text-muted-foreground'>OR</span>
        <div className='flex-1 h-px bg-border'></div>
      </div>

      {/* Social Login */}
      <div className='space-y-3'>
        <button className='w-full py-3 rounded-lg border border-border text-foreground hover:bg-card transition-all flex items-center justify-center gap-2'>
          <svg className='w-5 h-5' viewBox='0 0 24 24' fill='currentColor'>
            <path d='M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12-5.37-12-12-12zm0 22c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10z' />
          </svg>
          Continue with Google
        </button>
      </div>

      {/* Sign Up Link */}
      <div className='text-center'>
        <p className='text-muted-foreground'>Don&apos;t have an account?{' '}
          <Link href='/auth/register' className='text-primary hover:text-secondary transition-colors font-semibold'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
