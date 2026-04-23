'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Bell, Shield, Eye, EyeOff, CheckCircle, FileCheck, AlertTriangle, Upload, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import PowaUpPurchase from '@/components/PowaUpPurchase';
import { apiClient } from '@/lib/api';

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

  // KYC State
  const [kycStatus, setKycStatus] = useState<{
    status: string;
    canUpdate: boolean;
    kyc: any;
  }>({ status: 'not-submitted', canUpdate: true, kyc: null });
  const [kycLoading, setKycLoading] = useState(false);
  const [kycForm, setKycForm] = useState({
    fullName: '',
    dateOfBirth: '',
    identityPhoto: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
    
    // Fetch KYC status
    const fetchKYCStatus = async () => {
      try {
        const status = await apiClient.getKYCStatus();
        setKycStatus(status);
        if (status.kyc) {
          setKycForm({
            fullName: status.kyc.fullName || '',
            dateOfBirth: status.kyc.dateOfBirth ? new Date(status.kyc.dateOfBirth).toISOString().split('T')[0] : '',
            identityPhoto: ''
          });
        }
      } catch (error) {
        console.error('[v0] Error fetching KYC status:', error);
      }
    };
    fetchKYCStatus();
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

  const handleKYCFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKycForm(prev => ({
          ...prev,
          identityPhoto: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kycForm.fullName || !kycForm.dateOfBirth || !kycForm.identityPhoto) {
      setError('Please fill in all KYC fields including the identity photo');
      return;
    }

    try {
      setKycLoading(true);
      setError('');
      setSuccess('');

      // Use update if resubmitting, otherwise submit
      if (kycStatus.status === 'rejected') {
        await apiClient.updateKYC(kycForm);
      } else {
        await apiClient.submitKYC(kycForm);
      }

      setSuccess('KYC submitted successfully! Admin will review your documents.');
      
      // Refresh KYC status
      const status = await apiClient.getKYCStatus();
      setKycStatus(status);
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC');
    } finally {
      setKycLoading(false);
    }
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
      <div className='space-y-4 sm:space-y-6 md:space-y-8 w-full px-2 sm:px-4 md:px-6 max-w-4xl mx-auto'>
        {/* Header */}
        <div className='space-y-1 sm:space-y-2'>
          <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-foreground'>Settings</h1>
          <p className='text-xs sm:text-sm md:text-base text-muted-foreground'>Manage your account settings and preferences</p>
        </div>

        {/* Messages */}
        {error && (
          <div className='p-3 sm:p-4 md:p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs sm:text-sm'>
            {error}
          </div>
        )}

        {success && (
          <div className='p-3 sm:p-4 md:p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs sm:text-sm flex items-center gap-2'>
            <CheckCircle size={16} className='sm:w-5 sm:h-5 flex-shrink-0' />
            {success}
          </div>
        )}

        {/* Profile Settings */}
        <div className='rounded-lg bg-card border border-border p-4 sm:p-6 md:p-8'>
          <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2'>
            <User size={20} className='sm:w-6 sm:h-6 text-primary' />
            Personal Information
          </h2>

          <form onSubmit={handleProfileSubmit} className='space-y-3 sm:space-y-4'>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Full Name</label>
              <input
                type='text'
                name='fullName'
                value={profile.fullName}
                onChange={handleProfileChange}
                className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                placeholder='Your full name'
              />
            </div>

            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Email Address</label>
              <input
                type='email'
                name='email'
                value={profile.email}
                onChange={handleProfileChange}
                className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                placeholder='your.email@example.com'
              />
            </div>

            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Phone Number</label>
              <input
                type='tel'
                name='phone'
                value={profile.phone}
                onChange={handleProfileChange}
                className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                placeholder='+1 (555) 000-0000'
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 text-sm sm:text-base'
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div className='rounded-lg bg-card border border-border p-4 sm:p-6 md:p-8'>
          <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2'>
            <Lock size={20} className='sm:w-6 sm:h-6 text-primary' />
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className='space-y-3 sm:space-y-4'>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Current Password</label>
              <div className='relative'>
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  name='currentPassword'
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                  placeholder='Enter current password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>New Password</label>
              <div className='relative'>
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  name='newPassword'
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                  placeholder='Enter new password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Confirm Password</label>
              <div className='relative'>
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  name='confirmPassword'
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                  placeholder='Confirm new password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 text-sm sm:text-base'
            >
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Notification Settings */}
        <div className='rounded-lg bg-card border border-border p-4 sm:p-6 md:p-8'>
          <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2'>
            <Bell size={20} className='sm:w-6 sm:h-6 text-primary' />
            Notification Preferences
          </h2>

          <div className='space-y-2 sm:space-y-3'>
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
              { key: 'tradingAlerts', label: 'Trading Alerts', desc: 'Get notified when trading opportunities arise' },
              { key: 'returnAlerts', label: 'Return Alerts', desc: 'Receive daily return notifications' },
              { key: 'withdrawalAlerts', label: 'Withdrawal Alerts', desc: 'Get notified of withdrawal activities' },
              { key: 'securityAlerts', label: 'Security Alerts', desc: 'Critical security notifications' }
            ].map(({ key, label, desc }) => (
              <label key={key} className='flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors'>
                <input
                  type='checkbox'
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={() => handleNotificationChange(key)}
                  className='w-4 h-4 sm:w-5 sm:h-5 rounded border-border cursor-pointer mt-0.5 flex-shrink-0'
                />
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-foreground text-xs sm:text-sm'>{label}</p>
                  <p className='text-xs text-muted-foreground'>{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* KYC Verification Section */}
        <div className='rounded-lg bg-card border border-border p-4 sm:p-6 md:p-8'>
          <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2'>
            <FileCheck size={20} className='sm:w-6 sm:h-6 text-primary' />
            KYC Verification
          </h2>

          {/* KYC Status Display */}
          <div className='mb-6'>
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              kycStatus.status === 'approved' || kycStatus.status === 'verified' 
                ? 'bg-green-500/10 border border-green-500/20'
                : kycStatus.status === 'pending'
                ? 'bg-yellow-500/10 border border-yellow-500/20'
                : kycStatus.status === 'rejected'
                ? 'bg-red-500/10 border border-red-500/20'
                : 'bg-muted border border-border'
            }`}>
              {kycStatus.status === 'approved' || kycStatus.status === 'verified' ? (
                <>
                  <CheckCircle size={20} className='text-green-600 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='font-semibold text-green-700'>KYC Verified</p>
                    <p className='text-sm text-green-600'>Your identity has been verified. You can now withdraw funds.</p>
                  </div>
                </>
              ) : kycStatus.status === 'pending' ? (
                <>
                  <RefreshCw size={20} className='text-yellow-600 flex-shrink-0 mt-0.5 animate-spin' />
                  <div>
                    <p className='font-semibold text-yellow-700'>KYC Under Review</p>
                    <p className='text-sm text-yellow-600'>Your documents are being reviewed by our team. This usually takes 4 hours.</p>
                  </div>
                </>
              ) : kycStatus.status === 'rejected' ? (
                <>
                  <AlertTriangle size={20} className='text-red-600 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='font-semibold text-red-700'>KYC Rejected</p>
                    <p className='text-sm text-red-600'>
                      {kycStatus.kyc?.rejectionReason || 'Your documents were rejected. Please resubmit with correct information.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <FileCheck size={20} className='text-muted-foreground flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='font-semibold text-foreground'>KYC Not Submitted</p>
                    <p className='text-sm text-muted-foreground'>Complete KYC verification to enable withdrawals over $300.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KYC Form - Show only if not verified */}
          {(kycStatus.status !== 'approved' && kycStatus.status !== 'verified' && kycStatus.status !== 'pending') && (
            <form onSubmit={handleKYCSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Full Name (as on ID)</label>
                <input
                  type='text'
                  value={kycForm.fullName}
                  onChange={(e) => setKycForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                  placeholder='Enter your full legal name'
                  disabled={kycLoading}
                />
              </div>

              <div>
                <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Date of Birth</label>
                <input
                  type='date'
                  value={kycForm.dateOfBirth}
                  onChange={(e) => setKycForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className='w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary'
                  disabled={kycLoading}
                />
              </div>

              <div>
                <label className='block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2'>Identity Document Photo</label>
                <label className='flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors'>
                  <div className='text-center'>
                    <Upload size={24} className='mx-auto text-muted-foreground mb-2' />
                    <p className='text-sm font-semibold text-foreground'>
                      {kycForm.identityPhoto ? 'Document uploaded' : 'Click to upload'}
                    </p>
                    <p className='text-xs text-muted-foreground'>PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={handleKYCFileUpload}
                    disabled={kycLoading}
                    className='hidden'
                  />
                </label>
                {kycForm.identityPhoto && (
                  <p className='mt-2 text-xs text-green-600 flex items-center gap-1'>
                    <CheckCircle size={14} />
                    Document uploaded successfully
                  </p>
                )}
              </div>

              <button
                type='submit'
                disabled={kycLoading || !kycForm.fullName || !kycForm.dateOfBirth || !kycForm.identityPhoto}
                className='w-full px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 text-sm sm:text-base'
              >
                {kycLoading ? 'Submitting...' : kycStatus.status === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}
              </button>
            </form>
          )}
        </div>

        {/* PowaUp Purchase */}
        <PowaUpPurchase />

        {/* Two-Factor Authentication */}
        <div className='rounded-lg bg-card border border-border p-4 sm:p-6 md:p-8'>
          <h2 className='text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2'>
            <Shield size={20} className='sm:w-6 sm:h-6 text-primary' />
            Security
          </h2>

          <div className='space-y-3 sm:space-y-4'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg'>
              <div className='min-w-0'>
                <p className='font-medium text-foreground text-sm sm:text-base'>Two-Factor Authentication</p>
                <p className='text-xs sm:text-sm text-muted-foreground'>Enhance your account security</p>
              </div>
              <button
                onClick={() => setShowTwoFactor(!showTwoFactor)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                  twoFactorEnabled
                    ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
              </button>
            </div>

            {showTwoFactor && !twoFactorEnabled && (
              <div className='p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-3'>
                <p className='text-xs sm:text-sm text-yellow-600'>
                  Two-factor authentication adds an extra layer of security to your account. You will need to enter a code from your authenticator app in addition to your password.
                </p>
                <button className='w-full px-3 sm:px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 font-semibold transition-all text-xs sm:text-sm'>
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
