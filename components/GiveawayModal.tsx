'use client';

import { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface GiveawayModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCode: string;
  currentBalance: number;
  powaUpBalance: number;
  onSuccess?: () => void;
}

export function GiveawayModal({
  isOpen,
  onClose,
  userCode,
  currentBalance,
  powaUpBalance,
  onSuccess
}: GiveawayModalProps) {
  const [recipientCode, setRecipientCode] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'usd' | 'powaup'>('usd');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [validatingRecipient, setValidatingRecipient] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'otp'>('select');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpExpireTime, setOtpExpireTime] = useState<Date | null>(null);

  if (!isOpen) return null;

  const handleRecipientChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setRecipientCode(code);
    setRecipientInfo(null);

    if (code.length === 6) {
      setValidatingRecipient(true);
      try {
        const result = await apiClient.validateRecipient(code);
        if (result.valid) {
          setRecipientInfo(result.recipient);
          setError('');
        } else {
          setError(result.message || 'Recipient not found');
        }
      } catch (err: any) {
        setError('Error validating recipient');
      } finally {
        setValidatingRecipient(false);
      }
    }
  };

  const handleRequestOtp = async () => {
    try {
      setRequestingOtp(true);
      setError('');

      const response = await apiClient.requestWithdrawalOTP();
      
      if (response.message || response.requiresOTP) {
        setOtpRequested(true);
        // Set OTP expiration to 10 minutes from now
        const expireTime = new Date(Date.now() + 10 * 60 * 1000);
        setOtpExpireTime(expireTime);
        
        // Show success message
        const successMsg = `OTP sent to your email. It will expire in 10 minutes.`;
        console.log('[v0] OTP Request Success:', successMsg);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
      console.error('[v0] OTP Request Error:', err);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleSendGiveaway = async () => {
    try {
      setLoading(true);
      setError('');

      if (!recipientCode || !amount || !recipientInfo) {
        setError('Please enter all required fields');
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (parsedAmount <= 0) {
        setError('Amount must be greater than zero');
        return;
      }

      // Check balance
      const maxAmount = type === 'usd' ? currentBalance : powaUpBalance;
      if (parsedAmount > maxAmount) {
        setError(`Insufficient ${type === 'usd' ? 'USD' : 'PowaUp'} balance`);
        return;
      }

      // For USD, need OTP
      if (type === 'usd') {
        if (!otp) {
          setError('OTP is required for USD transfers');
          return;
        }
        setStep('otp');
      }

      // Send giveaway
      const result = await apiClient.sendGiveaway(recipientCode, parsedAmount, type, type === 'usd' ? otp : undefined);

      if (result.success) {
        // Reset form
        setRecipientCode('');
        setAmount('');
        setOtp('');
        setRecipientInfo(null);
        setStep('select');
        
        // Notify success
        alert(`Successfully sent ${parsedAmount} ${type === 'usd' ? 'USD' : 'PowaUp'} to ${result.message}`);
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send giveaway');
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = type === 'usd' ? currentBalance : powaUpBalance;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-card rounded-lg max-w-md w-full'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-border'>
          <h2 className='text-xl font-bold text-foreground'>Send Giveaway</h2>
          <button onClick={onClose} className='text-muted-foreground hover:text-foreground'>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Error message */}
          {error && (
            <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex gap-2'>
              <AlertCircle size={20} className='flex-shrink-0 mt-0.5' />
              <span className='text-sm'>{error}</span>
            </div>
          )}

          {/* Type selection */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-3'>Type</label>
            <div className='grid grid-cols-2 gap-3'>
              <button
                type='button'
                onClick={() => setType('usd')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === 'usd'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                💰 USD
              </button>
              <button
                type='button'
                onClick={() => setType('powaup')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === 'powaup'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                ⚡ PowaUp
              </button>
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Available: {type === 'usd' ? `$${maxAmount.toFixed(2)}` : `${maxAmount} PowaUp`}
            </p>
          </div>

          {/* Recipient */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Recipient 6-Digit Code</label>
            <input
              type='text'
              placeholder='e.g., 123456'
              value={recipientCode}
              onChange={handleRecipientChange}
              maxLength={6}
              className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              disabled={loading}
            />
            {validatingRecipient && (
              <p className='text-xs text-muted-foreground mt-2'>Validating...</p>
            )}
            {recipientInfo && (
              <div className='mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20'>
                <p className='text-sm text-green-600 font-semibold'>{recipientInfo.fullName}</p>
                <p className='text-xs text-green-600'>{recipientInfo.userCode}</p>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className='block text-sm font-semibold text-foreground mb-2'>Amount</label>
            <div className='flex gap-2'>
              <input
                type='number'
                placeholder='0.00'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min='0'
                step='0.01'
                className='flex-1 px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                disabled={loading}
              />
              <button
                type='button'
                onClick={() => setAmount(maxAmount.toString())}
                className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90'
                disabled={loading}
              >
                Max
              </button>
            </div>
          </div>

          {/* OTP for USD */}
          {type === 'usd' && (
            <div>
              <label className='block text-sm font-semibold text-foreground mb-2'>Withdrawal OTP</label>
              <p className='text-xs text-muted-foreground mb-3'>
                {otpRequested 
                  ? `OTP sent to your email. Expires in ${otpExpireTime ? Math.max(0, Math.ceil((otpExpireTime.getTime() - Date.now()) / 60000)) : 10} minutes.`
                  : 'Enter the OTP sent to your email for security verification'}
              </p>
              
              {!otpRequested ? (
                <button
                  type='button'
                  onClick={handleRequestOtp}
                  disabled={requestingOtp || loading}
                  className='w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-3'
                >
                  {requestingOtp ? 'Sending OTP...' : 'Request OTP'}
                </button>
              ) : (
                <input
                  type='text'
                  placeholder='Enter 6-digit OTP'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  maxLength={6}
                  className='w-full px-4 py-2 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                  disabled={loading}
                />
              )}
            </div>
          )}

          {/* Info box */}
          <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm'>
            <p className='font-semibold mb-1'>Important:</p>
            <ul className='list-disc list-inside space-y-1 text-xs'>
              <li>USD transfers require OTP verification</li>
              <li>PowaUp transfers are instant</li>
              <li>Cannot send to yourself</li>
              <li>Transaction is permanent</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className='flex gap-3 pt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-all'
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSendGiveaway}
              disabled={loading || !recipientInfo || !amount || (type === 'usd' && (!otpRequested || !otp)) || requestingOtp}
              className='flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              <Send size={18} />
              {loading ? 'Sending...' : type === 'usd' && !otpRequested ? 'Request OTP First' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
