'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Bell, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import PowaUpPurchase from '@/components/PowaUpPurchase';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Password Form State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    tradingAlerts: true,
    returnAlerts: true,
    withdrawalAlerts: true,
    securityAlerts: true
  });

  // Two-Factor Authentication
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof notifications]
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireUser>
      <div className='space-y-8 max-w-2xl'>
        {/* Header */}
        <div>
          <h1 className='text-3xl font-bold text-foreground'>Settings</h1>
          <p className='text-muted-foreground mt-2'>Manage your account settings and preferences</p>
        </div>

        {/* Messages */}
        {error && (
          <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
            {error}
          </div>
        )}

        {success && (
          <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm flex items-center gap-2'>
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        {/* Profile Settings */}
        <div className='rounded-lg bg-card border border-border p-6'>
          <h2 className='text-xl font-bold text-foreground mb-6 flex items-center gap-2'>
            <User size={24} className='text-primary' />
            Personal Information
          </h2>

          <form onSubmit={handleProfileSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>Full Name</label>
              <input
                type='text'
                name='fullName'
                value={profile.fullName}
                onChange={handleProfileChange}
                className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                placeholder='Your full name'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>Email Address</label>
              <input
                type='email'
                name='email'
                value={profile.email}
                onChange={handleProfileChange}
                className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                placeholder='your.email@example.com'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>Phone Number</label>
              <input
                type='tel'
                name='phone'
                value={profile.phone}
                onChange={handleProfileChange}
                className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                placeholder='+1 (555) 000-0000'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50'
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div className='rounded-lg bg-card border border-border p-6'>
          <h2 className='text-xl font-bold text-foreground mb-6 flex items-center gap-2'>
            <Lock size={24} className='text-primary' />
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>Current Password</label>
              <div className='relative'>
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  name='currentPassword'
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                  placeholder='Enter current password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>New Password</label>
              <div className='relative'>
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  name='newPassword'
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                  placeholder='Enter new password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>Confirm Password</label>
              <div className='relative'>
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  name='confirmPassword'
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground focus:outline-none focus:border-primary'
                  placeholder='Confirm new password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50'
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Notification Settings */}
        <div className='rounded-lg bg-card border border-border p-6'>
          <h2 className='text-xl font-bold text-foreground mb-6 flex items-center gap-2'>
            <Bell size={24} className='text-primary' />
            Notification Preferences
          </h2>

          <div className='space-y-4'>
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'tradingAlerts', label: 'Trading Alerts', desc: 'Get notified when trading opportunities arise' },
              { key: 'returnAlerts', label: 'Return Alerts', desc: 'Receive daily return notifications' },
              { key: 'withdrawalAlerts', label: 'Withdrawal Alerts', desc: 'Get notified of withdrawal activities' },
              { key: 'securityAlerts', label: 'Security Alerts', desc: 'Critical security notifications' }
            ].map(({ key, label, desc }) => (
              <label key={key} className='flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'>
                <input
                  type='checkbox'
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={() => handleNotificationChange(key)}
                  className='w-5 h-5 rounded border-border cursor-pointer'
                />
                <div>
                  <p className='font-medium text-foreground'>{label}</p>
                  <p className='text-xs text-muted-foreground'>{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* PowaUp Purchase */}
        <PowaUpPurchase />

        {/* Two-Factor Authentication */}
        <div className='rounded-lg bg-card border border-border p-6'>
          <h2 className='text-xl font-bold text-foreground mb-6 flex items-center gap-2'>
            <Shield size={24} className='text-primary' />
            Security
          </h2>

          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-muted/50 rounded-lg'>
              <div>
                <p className='font-medium text-foreground'>Two-Factor Authentication</p>
                <p className='text-xs text-muted-foreground'>Enhance your account security</p>
              </div>
              <button
                onClick={() => setShowTwoFactor(!showTwoFactor)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  twoFactorEnabled
                    ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
              </button>
            </div>

            {showTwoFactor && !twoFactorEnabled && (
              <div className='p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-4'>
                <p className='text-sm text-yellow-600'>
                  Two-factor authentication adds an extra layer of security to your account. You will need to enter a code from your authenticator app in addition to your password.
                </p>
                <button className='w-full px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 font-semibold transition-all'>
                  Set Up Authenticator App
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
