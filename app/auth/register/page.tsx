'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, ArrowLeft, Gift, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userRegister } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for referral code in URL on mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      validateReferralCode(refCode);
    }
  }, [searchParams]);
  
  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferrerName('');
      return;
    }
    
    setValidatingCode(true);
    try {
      const result = await apiClient.validateReferralCode(code);
      if (result.valid) {
        setReferrerName(result.referrerName);
      } else {
        setReferrerName('');
      }
    } catch (error) {
      setReferrerName('');
    } finally {
      setValidatingCode(false);
    }
  };
  
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setReferralCode(code);
    if (code.length >= 6) {
      validateReferralCode(code);
    } else {
      setReferrerName('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && formData.fullName && formData.email && formData.phone) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await userRegister({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        referralCode: referralCode || undefined
      });
      router.push('/auth/register-success');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
        <h1 className='text-2xl font-bold text-foreground'>Create Account</h1>
        <p className='text-muted-foreground mt-2'>Join thousands of crypto investors</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
          {error}
        </div>
      )}

      {/* Progress Steps */}
      <div className='flex items-center gap-2'>
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`}></div>
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`}></div>
      </div>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <form onSubmit={handleNext} className='space-y-4'>
          {/* Full Name */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Full Name</label>
            <div className='relative'>
              <User className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
              <input
                type='text'
                name='fullName'
                value={formData.fullName}
                onChange={handleChange}
                required
                className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='John Doe'
              />
            </div>
          </div>

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

          {/* Phone */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Phone Number</label>
            <div className='relative'>
              <Phone className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
              <input
                type='tel'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                required
                className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='+1 (234) 567-8900'
              />
            </div>
          </div>

          {/* Referral Code (Optional) */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>
              Referral Code <span className='text-muted-foreground font-normal'>(Optional)</span>
            </label>
            <div className='relative'>
              <Gift className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
              <input
                type='text'
                value={referralCode}
                onChange={handleReferralCodeChange}
                className='w-full pl-10 pr-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase'
                placeholder='Enter referral code'
                maxLength={10}
              />
              {validatingCode && (
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>
                  Checking...
                </span>
              )}
            </div>
            {referrerName && (
              <p className='mt-2 text-sm text-green-600 flex items-center gap-1'>
                <CheckCircle size={16} />
                Referred by {referrerName}
              </p>
            )}
            {referralCode && !referrerName && !validatingCode && referralCode.length >= 6 && (
              <p className='mt-2 text-sm text-red-500'>
                Invalid referral code
              </p>
            )}
          </div>

          <button
            type='submit'
            className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all'
          >
            Continue
          </button>
        </form>
      )}

      {/* Step 2: Password & Terms */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Password */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Password</label>
            <div className='relative'>
              <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name='password'
                value={formData.password}
                onChange={handleChange}
                required
                className='w-full pl-10 pr-10 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='********'
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

          {/* Confirm Password */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Confirm Password</label>
            <div className='relative'>
              <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name='confirmPassword'
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className='w-full pl-10 pr-10 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='********'
              />
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className='flex items-start gap-3'>
            <input
              type='checkbox'
              id='terms'
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              required
              className='mt-1'
            />
            <label htmlFor='terms' className='text-sm text-muted-foreground'>
              I agree to the{' '}
              <Link href='#' className='text-primary hover:text-secondary'>
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href='#' className='text-primary hover:text-secondary'>
                Privacy Policy
              </Link>
            </label>
          </div>

          <button
            type='submit'
            disabled={isLoading || !agreedTerms}
            className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button
            type='button'
            onClick={() => setStep(1)}
            className='w-full py-3 rounded-lg border border-border text-foreground hover:bg-card transition-all'
          >
            Back
          </button>
        </form>
      )}

      {/* Login Link */}
      <div className='text-center'>
        <p className='text-muted-foreground'>Already have an account?{' '}
          <Link href='/auth/login' className='text-primary hover:text-secondary transition-colors font-semibold'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function RegisterLoading() {
  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='flex items-center justify-center gap-2 mb-4'>
          <div className='w-16 h-16 rounded-lg flex items-center justify-center'>
            <Loader2 className='w-8 h-8 animate-spin text-primary' />
          </div>
        </div>
        <h1 className='text-2xl font-bold text-foreground'>Loading...</h1>
        <p className='text-muted-foreground mt-2'>Please wait</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
