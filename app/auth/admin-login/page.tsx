'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin } = useAuth();
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
      console.log('[v0] Admin login form submitted with email:', formData.email);
      await adminLogin(formData.email, formData.password);
      console.log('[v0] Admin login successful, redirecting to /admin');
      router.push('/admin');
    } catch (err: any) {
      console.error('[v0] Admin login error:', err?.message || err);
      setError(err?.message || 'Admin login failed. Please check your credentials.');
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
          <div className='w-16 h-16 rounded-lg flex items-center justify-center bg-primary/10'>
            <Lock size={32} className='text-primary' />
          </div>
        </div>
        <h1 className='text-2xl font-bold text-foreground'>Admin Login</h1>
        <p className='text-muted-foreground mt-2'>Admin Access Only</p>
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
          <label className='block text-sm font-semibold text-foreground mb-2'>Admin Email</label>
          <div className='relative'>
            <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
            <input
              type='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              required
              className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              placeholder='Email address'
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className='flex items-center justify-between mb-2'>
            <label className='block text-sm font-semibold text-foreground'>Password</label>
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
          {isLoading ? 'Signing in...' : 'Sign in as Admin'}
        </button>
      </form>

      {/* Footer */}
      <div className='text-center pt-4 border-t border-border'>
        <p className='text-muted-foreground text-sm'>
          Not an admin?{' '}
          <Link href='/auth/login' className='text-primary hover:text-secondary transition-colors font-semibold'>
            User Login
          </Link>
        </p>
      </div>
    </div>
  );
}
