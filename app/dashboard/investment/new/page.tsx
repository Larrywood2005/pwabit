'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Package {
  id: string;
  name: string;
  min: number;
  max: number | null;
  dailyReturn: number;
  features: string[];
  popular?: boolean;
}

interface WalletNetwork {
  network: string;
  address: string;
}

interface WalletInfo {
  usdtBep20?: WalletNetwork;
  ustdERC20?: WalletNetwork;
  sol?: WalletNetwork;
}

const DEPOSIT_WALLETS: WalletInfo = {
  usdtBep20: {
    network: 'USDT BEP20(Binance Smart Chain)',
    address: '0x1f4a8ee948707200ffe3ea715617887b2908b750'
  },
  ustdERC20: {
    network: 'ERC20 (Ethereum)',
    address: '0x1f4a8ee948707200ffe3ea715617887b2908b750'
  },
  sol: {
    network: 'SOL',
    address: 'Ffq5xhXS4wqeqbJQ8JVyK7zro6usMQXVe1KerBeA1jQ1'
  }
};

export default function NewInvestmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState<WalletInfo>(DEPOSIT_WALLETS);
  const [step, setStep] = useState<'packages' | 'details' | 'payment'>('packages');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [paymentSent, setPaymentSent] = useState(false);

  const packages: Package[] = [
    {
      id: 'starter',
      name: 'Starter Package',
      min: 10,
      max: 999,
      dailyReturn: 3,
      features: [
        '3% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'Basic support',
        'KYC for deposits > $300',
        'Real-time updates'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Package',
      min: 1000,
      max: 4999,
      dailyReturn: 3,
      popular: true,
      features: [
        '3% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'Priority support',
        'KYC verification required',
        'Real-time updates',
        'Portfolio analytics',
        'Advanced trading tools'
      ]
    },
    {
      id: 'elite',
      name: 'Elite Package',
      min: 5000,
      max: null,
      dailyReturn: 3,
      features: [
        '3% daily returns',
        'Compound interest',
        'Trade after 24 hours',
        'VIP support 24/7',
        'Advanced KYC tier',
        'Real-time updates',
        'Premium analytics',
        'White-glove service',
        'Custom strategies'
      ]
    }
  ];



  const validateAmount = (): boolean => {
    if (!selectedPackage) return false;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < selectedPackage.min) {
      setError(`Minimum amount is $${selectedPackage.min}`);
      return false;
    }
    
    if (selectedPackage.max && amountNum > selectedPackage.max) {
      setError(`Maximum amount for this package is $${selectedPackage.max}`);
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (!selectedPackage) {
      setError('Please select a package');
      return;
    }
    
    if (!amount || !validateAmount()) {
      return;
    }
    
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    if (!paymentReceipt) {
      setError('Please upload a payment receipt');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Create investment first
      const response = await apiClient.createInvestment({
        packageId: selectedPackage?.id || '',
        amount: parseFloat(amount)
      });
      
      const investmentId = response.investment?._id || response.investmentId;

      // Upload payment receipt using Blob storage
      if (investmentId && paymentReceipt) {
        const formData = new FormData();
        formData.append('file', paymentReceipt);

        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            console.warn('[v0] Receipt upload warning:', await uploadResponse.text());
            // Don't fail the investment if receipt upload fails
          } else {
            const uploadData = await uploadResponse.json();
            const receiptUrl = uploadData.url;
            
            // Now save the receipt metadata to the investment
            try {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/investments/${investmentId}/update-receipt`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({
                  fileUrl: receiptUrl,
                  fileName: paymentReceipt.name,
                  receiptType: paymentReceipt.type.startsWith('image/') ? 'image' : 'pdf'
                }),
              });
              console.log('[v0] Receipt metadata saved successfully');
            } catch (metadataErr) {
              console.warn('[v0] Failed to save receipt metadata:', metadataErr);
            }
          }
        } catch (uploadErr) {
          console.warn('[v0] Receipt upload error:', uploadErr);
          // Continue anyway - investment was created
        }
      }

      setTransactionHash(response.transactionId || response.transaction?._id || 'TXN' + Date.now());
      setPaymentSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Receipt file must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        setError('Receipt must be a JPG, PNG, or PDF file');
        return;
      }
      
      setPaymentReceipt(file);
      setError('');
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(`📄 ${file.name}`);
      }
    }
  };

  const getDisplayAmount = () => {
    const baseAmount = parseFloat(amount || '0');
    return currency === 'NGN' ? (baseAmount * 1420).toLocaleString('en-US', { maximumFractionDigits: 0 }) : baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  if (step === 'packages') {
    return (
      <ProtectedRoute requireUser>
        <div className='space-y-8'>
          <div>
            <Link href='/dashboard' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-6'>
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
            <h1 className='text-3xl font-bold text-foreground'>Start New Investment</h1>
            <p className='text-muted-foreground mt-2'>Choose an investment package and earn daily returns</p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setStep('details');
                  setAmount('');
                }}
                className={`relative rounded-xl transition-all text-left flex flex-col h-full ${
                  pkg.popular
                    ? 'border-2 border-secondary bg-gradient-to-br from-secondary/10 to-transparent'
                    : 'border border-border hover:border-primary'
                }`}
              >
                {pkg.popular && (
                  <div className='absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-full'>
                    MOST POPULAR
                  </div>
                )}

                <div className='p-8 flex flex-col h-full'>
                  <div>
                    <h2 className='text-2xl font-bold text-foreground mb-2'>{pkg.name}</h2>
                    <div className='mb-6'>
                      <div className='text-4xl font-bold text-primary mb-2'>
                        ${pkg.min}
                        <span className='text-lg text-muted-foreground ml-2'>
                          {pkg.max ? `- $${pkg.max}` : '+'}
                        </span>
                      </div>
                      <div className='text-green-500 font-semibold'>{pkg.dailyReturn}% Daily Returns</div>
                    </div>
                  </div>

                  <div className='space-y-3 mb-8 flex-grow'>
                    {pkg.features.map((feature, idx) => (
                      <div key={idx} className='flex items-start gap-3'>
                        <CheckCircle className='text-primary mt-0.5 flex-shrink-0' size={20} />
                        <span className='text-foreground text-sm'>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`w-full py-3 rounded-lg font-semibold transition-all text-center ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
                      : 'border border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                  }`}>
                    Select Package
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (step === 'details') {
    return (
      <ProtectedRoute requireUser>
        <div className='max-w-2xl mx-auto space-y-8'>
          <div>
            <button
              onClick={() => setStep('packages')}
              className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-6'
            >
              <ArrowLeft size={20} />
              Back to Packages
            </button>
            <h1 className='text-3xl font-bold text-foreground'>Investment Details</h1>
            <p className='text-muted-foreground mt-2'>Configure your investment amount</p>
          </div>

          <div className='p-8 rounded-lg bg-card border border-border space-y-6'>
            <div>
              <p className='text-sm text-muted-foreground mb-2'>Selected Package</p>
              <p className='text-2xl font-bold text-foreground'>{selectedPackage?.name}</p>
            </div>

            {/* Currency Toggle - USD Only */}
            <div>
              <label className='block text-sm font-semibold text-foreground mb-3'>Currency</label>
              <div className='p-4 rounded-lg bg-primary/10 border border-primary/30'>
                <p className='font-semibold text-primary'>USD ($) - Crypto Payments Only</p>
                <p className='text-xs text-muted-foreground mt-1'>All investments are denominated in USD and paid via cryptocurrency</p>
              </div>
            </div>

            <div>
              <label className='block text-sm font-semibold text-foreground mb-2'>Investment Amount (USD)</label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold'>$</span>
                <input
                  type='number'
                  step='0.01'
                  min={selectedPackage?.min || 0}
                  max={selectedPackage?.max || undefined}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  placeholder='Enter investment amount'
                  className='w-full pl-8 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>
              <p className='text-xs text-muted-foreground mt-2'>
                Min: ${selectedPackage?.min} {selectedPackage?.max && `• Max: $${selectedPackage.max}`}
              </p>
            </div>

            {error && (
              <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
                {error}
              </div>
            )}

            <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm'>
              <p className='font-semibold mb-2'>Expected Daily Return</p>
              <p className='text-lg font-bold'>
                ${(parseFloat(amount || '0') * (selectedPackage?.dailyReturn || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className='flex gap-4'>
              <button
                onClick={() => setStep('packages')}
                className='flex-1 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-background transition-all'
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={!amount}
                className='flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireUser>
      <div className='max-w-2xl mx-auto space-y-8'>
        <div>
          <h1 className='text-3xl font-bold text-foreground'>Payment Details</h1>
          <p className='text-muted-foreground mt-2'>Send {amount} USD in cryptocurrency to activate your investment</p>
        </div>

        {/* SUCCESS PAGE - Show when payment is sent */}
        {paymentSent ? (
          <div className='space-y-6'>
            <div className='p-8 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/50 space-y-4'>
              <div className='flex items-center justify-center mb-4'>
                <CheckCircle className='text-green-600 w-16 h-16' />
              </div>
              <h2 className='text-3xl font-bold text-center text-green-600'>Payment Received Successfully! ✓</h2>
              <p className='text-center text-lg text-muted-foreground'>Your investment is now under review</p>
            </div>

            {/* Success Details */}
            <div className='p-8 rounded-lg bg-card border border-border space-y-6'>
              <div>
                <h3 className='text-xl font-bold text-foreground mb-4'>What Happens Next?</h3>
                <ul className='space-y-3'>
                  <li className='flex items-start gap-3'>
                    <CheckCircle className='text-green-600 flex-shrink-0 mt-0.5' size={20} />
                    <div>
                      <p className='font-semibold text-foreground'>Payment Verified</p>
                      <p className='text-sm text-muted-foreground'>Your payment receipt is being reviewed by our team</p>
                    </div>
                  </li>
                  <li className='flex items-start gap-3'>
                    <div className='w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-primary'>2</div>
                    <div>
                      <p className='font-semibold text-foreground'>Activation</p>
                      <p className='text-sm text-muted-foreground'>Once verified (usually 2-4 hours), your investment will be activated</p>
                    </div>
                  </li>
                  <li className='flex items-start gap-3'>
                    <div className='w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-primary'>3</div>
                    <div>
                      <p className='font-semibold text-foreground'>Start Earning</p>
                      <p className='text-sm text-muted-foreground'>Begin earning {selectedPackage?.dailyReturn}% daily returns on your investment</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Investment Summary */}
              <div className='border-t border-border pt-6'>
                <h3 className='font-bold text-foreground mb-4'>Investment Summary</h3>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center p-3 bg-muted/50 rounded-lg'>
                    <span className='text-muted-foreground'>Package</span>
                    <span className='font-semibold text-foreground'>{selectedPackage?.name}</span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-muted/50 rounded-lg'>
                    <span className='text-muted-foreground'>Investment Amount</span>
                    <span className='font-semibold text-foreground'>${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30'>
                    <span className='text-muted-foreground'>Daily Return ({selectedPackage?.dailyReturn}%)</span>
                    <span className='font-bold text-green-600'>${(parseFloat(amount || '0') * (selectedPackage?.dailyReturn || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30'>
                    <span className='text-muted-foreground'>Reference ID</span>
                    <code className='font-mono text-sm text-foreground'>{transactionHash}</code>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className='space-y-3 pt-6 border-t border-border'>
                <button
                  onClick={() => router.push('/dashboard/investments')}
                  className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all'
                >
                  View My Investments
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className='w-full py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted/50 transition-all'
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Email Notification */}
            <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm'>
              <p className='font-semibold mb-1'>📧 Check Your Email</p>
              <p className='text-xs'>We've sent you a confirmation email with your investment details and next steps.</p>
            </div>
          </div>
        ) : (
          // Original payment flow
          <div className='space-y-6'>
          {/* Investment Summary */}
          <div className='p-8 rounded-lg bg-card border border-border space-y-4'>
            <h2 className='text-xl font-bold text-foreground'>Investment Summary</h2>
            <div className='space-y-2 border-t border-border pt-4'>
              <div className='flex justify-between items-center'>
                <p className='text-muted-foreground'>Package</p>
                <p className='font-semibold text-foreground'>{selectedPackage?.name}</p>
              </div>
              <div className='flex justify-between items-center'>
                <p className='text-muted-foreground'>Amount</p>
                <p className='font-semibold text-foreground'>${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='flex justify-between items-center'>
                <p className='text-muted-foreground'>Daily Return</p>
                <p className='font-semibold text-green-600'>${(parseFloat(amount || '0') * (selectedPackage?.dailyReturn || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Deposit Addresses */}
          <div className='p-8 rounded-lg bg-card border border-border space-y-4'>
            <h2 className='text-xl font-bold text-foreground'>Send Cryptocurrency</h2>
            
            <div className='space-y-4'>
              <div className='p-4 rounded-lg border border-border'>
                <p className='text-sm text-muted-foreground mb-2'>Network: USDT ERC20</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 p-2 rounded bg-background text-xs font-mono break-all text-foreground'>
                    {DEPOSIT_WALLETS.usdtBep20?.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(DEPOSIT_WALLETS.usdtBep20?.address || '', 'usdt')}
                    className='px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground'
                  >
                    {copied === 'usdt' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className='p-4 rounded-lg border border-border'>
                <p className='text-sm text-muted-foreground mb-2'>Network: Ethereum</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 p-2 rounded bg-background text-xs font-mono break-all text-foreground'>
                    {DEPOSIT_WALLETS.ustdERC20?.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(DEPOSIT_WALLETS.ustdERC20?.address || '', 'eth')}
                    className='px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground'
                  >
                    {copied === 'eth' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className='p-4 rounded-lg border border-border'>
                <p className='text-sm text-muted-foreground mb-2'>Network: SOL</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 p-2 rounded bg-background text-xs font-mono break-all text-foreground'>
                    {DEPOSIT_WALLETS.sol?.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(DEPOSIT_WALLETS.sol?.address || '', 'sol')}
                    className='px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground'
                  >
                    {copied === 'sol' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm'>
              <p className='font-semibold mb-2'>Important</p>
              <ul className='space-y-1 text-xs'>
                <li>• Send exactly ${parseFloat(amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} USD equivalent</li>
                <li>• Wait for blockchain confirmation (usually 10-30 minutes)</li>
                <li>• Your investment will be activated after admin verification</li>
                <li>• Do NOT send from exchange wallets</li>
              </ul>
            </div>
          </div>

          {/* Transaction Hash */}
          {transactionHash && (
            <div className='p-8 rounded-lg bg-green-500/10 border border-green-500/20 space-y-4'>
              <div className='flex items-center gap-3'>
                <CheckCircle className='text-green-600' size={24} />
                <h3 className='text-lg font-bold text-green-600'>Payment Submitted Successfully</h3>
              </div>
              <div className='space-y-2 text-sm text-muted-foreground'>
                <p>✓ Your payment receipt has been uploaded</p>
                <p>✓ Your investment will be confirmed once admin verifies the receipt</p>
                <p>✓ Confirmation typically takes 2-4 hours</p>
              </div>
              <div className='p-3 rounded bg-green-500/20 border border-green-500/50'>
                <p className='text-sm font-semibold text-green-700'>📋 Deposit Will Be Confirmed</p>
                <p className='text-xs text-green-600 mt-1'>Once verified, you'll receive an email confirmation and your investment will be activated.</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground mb-1'>Reference ID</p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 p-2 rounded bg-background text-sm font-mono text-foreground'>
                    {transactionHash}
                  </code>
                  <button
                    onClick={() => copyToClipboard(transactionHash, 'ref')}
                    className='px-3 py-2 rounded hover:bg-background transition-colors text-muted-foreground hover:text-foreground'
                  >
                    {copied === 'ref' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Receipt Upload */}
          <div className='p-8 rounded-lg bg-card border border-border space-y-4'>
            <h2 className='text-xl font-bold text-foreground'>Upload Payment Receipt</h2>
            <p className='text-sm text-muted-foreground'>Please upload a screenshot or PDF of your payment receipt before marking payment as sent.</p>
            
            <div className='border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors' onClick={() => document.getElementById('receiptInput')?.click()}>
              {receiptPreview ? (
                <div className='space-y-2'>
                  {paymentReceipt?.type.startsWith('image/') ? (
                    <img src={receiptPreview} alt='Receipt' className='max-h-40 mx-auto rounded' />
                  ) : (
                    <p className='text-2xl'>{receiptPreview}</p>
                  )}
                  <p className='text-sm text-muted-foreground'>{paymentReceipt?.name}</p>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentReceipt(null);
                      setReceiptPreview('');
                    }}
                    className='text-xs text-red-600 hover:text-red-700 font-semibold'
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className='space-y-2'>
                  <p className='text-sm font-semibold text-foreground'>📸 Click to upload receipt</p>
                  <p className='text-xs text-muted-foreground'>JPG, PNG or PDF (Max 5MB)</p>
                </div>
              )}
              <input
                id='receiptInput'
                type='file'
                accept='image/jpeg,image/png,application/pdf'
                onChange={handleReceiptUpload}
                className='hidden'
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-4'>
            <button
              onClick={() => setStep('details')}
              className='flex-1 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-background transition-all'
            >
              Back
            </button>
            <button
              onClick={handlePaymentSubmit}
              disabled={loading || !paymentReceipt}
              title={!paymentReceipt ? 'Please upload a payment receipt first' : ''}
              className='flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'Processing...' : 'I Sent the Payment'}
            </button>
          </div>

          {error && (
            <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm'>
              {error}
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className='w-full py-3 rounded-lg text-primary hover:text-secondary transition-colors font-semibold'
          >
            Skip for Now
          </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
