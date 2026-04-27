'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Wallet, Plus, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import KYCModal from '@/components/KYCModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { io } from 'socket.io-client';

interface WalletAddress {
  _id: string;
  walletAddress: string;
  walletType: string;
  isDefault: boolean;
  addedAt: string;
}

interface WithdrawalData {
  amount: number;
  currency: 'USD';
  walletId: string;
}

function WithdrawalPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [kycStatus, setKycStatus] = useState('not-submitted');

  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData>({
    amount: 0,
    currency: 'USD',
    walletId: ''
  });

  const [newWallet, setNewWallet] = useState({
    walletAddress: '',
    walletType: 'bitcoin'
  });

  // OTP states for withdrawal
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [withdrawalOTP, setWithdrawalOTP] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);
  const [showProcessing, setShowProcessing] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [completedWithdrawal, setCompletedWithdrawal] = useState<any>(null);

  const MIN_WITHDRAWAL = 10;

  useEffect(() => {
    if (user) {
      fetchUserData();
      
      // Initialize Socket.io for real-time updates with fallback mechanisms
      // Use base URL only - Socket.IO handles default path
      const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');
      
      let socket: any = null;
      try {
        socket = io(backendUrl, {
          auth: {
            token: localStorage.getItem('auth_token')
          },
          transports: ['websocket', 'polling'], // WebSocket first, polling as fallback
          reconnection: false, // Disable auto-reconnection to prevent console spam
          timeout: 10000
        });

        socket.on('connect', () => {
          const userId = user._id || user.id;
          if (userId) {
            socket.emit('join', userId);
          }
        });

        socket.on('connect_error', () => {
          // Silently handle - socket is optional for wallet page
          if (socket) {
            socket.disconnect();
          }
        });

        socket.on('disconnect', () => {
          // Socket disconnected - no action needed
        });

        // Listen for real-time wallet additions
        socket.on('wallet-added', (wallet: any) => {
          setWallets((prev: WalletAddress[]) => {
            // Check if wallet already exists
            if (prev.find(w => w._id === wallet._id)) {
              return prev;
            }
            return [wallet, ...prev];
          });
          toast({
            title: 'Wallet Added',
            description: `${wallet.walletAddress} has been added successfully`,
            duration: 3000
          });
        });
      } catch (socketError) {
        // Socket initialization failed - continue without real-time updates
        console.warn('[v0] Socket init failed, continuing without real-time updates');
      }

      // Refresh balance every 2 hours (7200000ms)
      const balanceInterval = setInterval(fetchUserData, 7200000);

      return () => {
        if (socket) {
          try {
            socket.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
        }
        clearInterval(balanceInterval);
      };
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage (key is 'auth_token', not 'token')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const [userData, walletsData, kycData, balanceData] = await Promise.all([
        apiClient.getUserProfile(),
        apiClient.getWalletAddresses(),
        apiClient.getKYCStatus(),
        // IMPORTANT: Pass authorization header to get authenticated balance
        fetch('/api/investments/balance/info', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(r => r.json()).catch(() => ({}))
      ]);

      // ALWAYS use availableBalance for withdrawals
      // availableBalance = withdrawable funds (what users can actually withdraw)
      // totalBalance includes locked funds and should NOT be used for withdrawal
      const displayBalance = Math.max(0, balanceData.availableBalance || 0);
      
      console.log('[v0] Withdraw Balance:', { 
        availableBalance: balanceData.availableBalance,
        totalBalance: balanceData.totalBalance,
        lockedInTrades: balanceData.lockedInTrades,
        displayBalance 
      });
      
      setBalance(displayBalance);
      // Handle both response formats: { data: [...] } or { wallets: [...] }
      const walletsArray = walletsData.data || walletsData.wallets || [];
      setWallets(walletsArray);
      setKycStatus(kycData.status || 'not-submitted');

      // Set default wallet if available
      const defaultWallet = walletsArray.find((w: any) => w.isDefault);
      if (defaultWallet) {
        setWithdrawalData(prev => ({ ...prev, walletId: defaultWallet._id }));
      } else if (walletsArray.length > 0) {
        // If no default, select the first wallet
        setWithdrawalData(prev => ({ ...prev, walletId: walletsArray[0]._id }));
      }
    } catch (error: any) {
      console.error('[v0] Fetch user data error:', {
        message: error?.message,
        status: error?.response?.status,
        error: error
      });
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load withdrawal information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };



  const handleAddWallet = async () => {
    if (!newWallet.walletAddress.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a wallet address',
        variant: 'destructive'
      });
      return;
    }

    try {
      setWithdrawalLoading(true);
      await apiClient.addWalletAddress({
        walletAddress: newWallet.walletAddress,
        walletType: newWallet.walletType
      });

      toast({
        title: 'Success',
        description: 'Wallet address added successfully',
        variant: 'default'
      });

      setNewWallet({ walletAddress: '', walletType: 'bitcoin' });
      setShowAddWallet(false);
      await fetchUserData();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add wallet address';
      console.error('[v0] Add wallet error:', {
        message: errorMessage,
        status: error?.response?.status,
        error: error
      });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    // Prevent double-click
    if (withdrawalLoading) {
      return;
    }

    // Validation
    if (!withdrawalData.walletId) {
      toast({
        title: 'Error',
        description: 'Please select a wallet address',
        variant: 'destructive'
      });
      return;
    }

    if (withdrawalData.amount < MIN_WITHDRAWAL) {
      toast({
        title: 'Error',
        description: `Minimum withdrawal amount is $${MIN_WITHDRAWAL}`,
        variant: 'destructive'
      });
      return;
    }

    if (withdrawalData.amount > balance) {
      toast({
        title: 'Error',
        description: 'Insufficient balance',
        variant: 'destructive'
      });
      return;
    }

    // Check KYC if balance is over $300 (both 'approved' and 'verified' are valid)
    if (balance > 300 && kycStatus !== 'approved' && kycStatus !== 'verified') {
      setShowKYCModal(true);
      return;
    }

    // Set loading IMMEDIATELY to prevent any double-clicks
    setWithdrawalLoading(true);

    try {
      // First, request OTP for withdrawal security
      await apiClient.post('/auth/request-withdrawal-otp', {});
      
      // Store the pending withdrawal details
      const pendingWithdrawalData = {
        amount: withdrawalData.amount,
        currency: withdrawalData.currency,
        walletId: withdrawalData.walletId,
        method: withdrawalData.walletId ? 'crypto' : 'bank_transfer'
      };
      
      setPendingWithdrawal(pendingWithdrawalData);
      setShowOTPModal(true);
      setWithdrawalOTP('');
      
      toast({
        title: 'OTP Sent',
        description: 'Check your email for the withdrawal security code.',
        variant: 'default'
      });

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to request withdrawal OTP. Please try again.';
      console.error('[v0] Withdrawal OTP request error:', {
        message: errorMessage,
        status: error?.response?.status,
        error: error
      });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // Handle OTP verification - secure withdrawal with mandatory OTP
  const handleVerifyWithdrawalOTP = async () => {
    if (!withdrawalOTP.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive'
      });
      return;
    }

    // CRITICAL DEBUG: Log OTP before sending
    console.log('[v0] Frontend - OTP Submission Debug:', {
      otpValue: withdrawalOTP,
      otpLength: withdrawalOTP.length,
      otpTrimmed: withdrawalOTP.trim(),
      otpTrimmedLength: withdrawalOTP.trim().length,
      pendingWithdrawalAmount: pendingWithdrawal?.amount,
      pendingWithdrawalCurrency: pendingWithdrawal?.currency,
      timestamp: new Date().toISOString()
    });

    try {
      setOtpLoading(true);
      setShowOTPModal(false);

      // Show processing state while verifying OTP and processing withdrawal
      setWithdrawalSuccess(true);
      setCompletedWithdrawal({
        amount: pendingWithdrawal?.amount || 0,
        currency: pendingWithdrawal?.currency || 'USD',
        transactionId: 'processing-' + Date.now(),
        verifying: true
      });

      // Process withdrawal with OTP verification (mandatory security check)
      if (pendingWithdrawal) {
        const withdrawalPayload: any = {
          amount: pendingWithdrawal.amount,
          currency: pendingWithdrawal.currency,
          method: pendingWithdrawal.method,
          otp: withdrawalOTP.trim() // CRITICAL: Ensure OTP is trimmed and matches backend expectation
        };

        if (pendingWithdrawal.walletId) {
          withdrawalPayload.walletId = pendingWithdrawal.walletId;
        }

        console.log('[v0] Frontend - Final withdrawal payload:', {
          amount: withdrawalPayload.amount,
          currency: withdrawalPayload.currency,
          otpLength: withdrawalPayload.otp?.length,
          otpFirst4: withdrawalPayload.otp?.substring(0, 4),
          otpLast2: withdrawalPayload.otp?.substring(withdrawalPayload.otp.length - 2),
          walletId: withdrawalPayload.walletId,
          method: withdrawalPayload.method,
          payloadKeys: Object.keys(withdrawalPayload)
        });

        try {
          // Make withdrawal request with OTP verification
          const response = await apiClient.post('/wallets/withdrawal', withdrawalPayload);

          console.log('[v0] Frontend - Withdrawal successful:', {
            transactionId: response?.withdrawal?._id || response?._id,
            amount: response?.withdrawal?.amount,
            newBalance: response?.newBalance,
            message: 'Backend confirmed withdrawal processing'
          });

          // Update the completion state with actual transaction ID
          setCompletedWithdrawal({
            amount: pendingWithdrawal.amount,
            currency: pendingWithdrawal.currency,
            transactionId: response?.withdrawal?._id || response?._id || `TXN-${Date.now()}`,
            verifying: false,
            verified: true,
            debitedAt: new Date().toISOString()
          });

          toast({
            title: 'Withdrawal Successful',
            description: `${pendingWithdrawal.currency === 'USD' ? '$' : '₦'}${pendingWithdrawal.amount.toLocaleString()} has been debited from your account. Admin will process payment shortly.`,
            variant: 'default'
          });

          // Reset form fields
          setWithdrawalOTP('');
          setPendingWithdrawal(null);

          // Refresh balance in real-time
          setTimeout(async () => {
            await fetchUserData();
          }, 500);
        } catch (withdrawalError: any) {
          console.error('[v0] Withdrawal processing error:', {
            message: withdrawalError?.message,
            status: withdrawalError?.response?.status,
            data: withdrawalError?.response?.data
          });
          // Show error on screen
          setCompletedWithdrawal((prev: any) => ({
            ...prev,
            verifying: false,
            error: true,
            errorMessage: withdrawalError?.response?.data?.message || withdrawalError?.message || 'Withdrawal failed'
          }));
          throw withdrawalError;
        }
      }
    } catch (error: any) {
      console.error('[v0] Withdrawal OTP verification error:', {
        message: error?.message,
        status: error?.response?.status
      });
      // Show error on screen
      setCompletedWithdrawal((prev: any) => ({
        ...prev,
        verifying: false,
        error: true,
        errorMessage: error?.response?.data?.message || error?.message || 'Withdrawal failed'
      }));
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to process withdrawal. Please try again.';
      toast({
        title: 'Withdrawal Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setOtpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Processing screen
  if (showProcessing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg p-8 max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Processing Withdrawal</h2>
            <p className="text-sm text-muted-foreground">
              Your withdrawal request is being processed. This may take a few moments.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold text-foreground">${pendingWithdrawal?.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-semibold text-blue-600">Processing...</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Please wait while we submit your withdrawal request.
          </p>
        </div>
      </div>
    );
  }

  // Withdrawal success screen - Shows confirmation with close button
  if (withdrawalSuccess && completedWithdrawal) {
    const isVerifying = (completedWithdrawal as any)?.verifying;
    const hasError = (completedWithdrawal as any)?.error;
    const isComplete = !isVerifying && !hasError;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg p-8 max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              {isVerifying ? (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                </>
              ) : hasError ? (
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {isVerifying ? 'Processing Withdrawal...' : hasError ? 'Withdrawal Failed' : 'Withdrawal Confirmed'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isVerifying 
                ? 'Debiting funds from your account...'
                : hasError
                ? (completedWithdrawal as any)?.errorMessage || 'An error occurred'
                : 'Funds debited. Admin will process payment shortly.'}
            </p>
          </div>

          <div className={`rounded-lg p-4 space-y-3 text-left border ${hasError ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-semibold text-foreground">${completedWithdrawal?.amount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transaction ID:</span>
              <span className="text-xs font-mono text-foreground">{completedWithdrawal?.transactionId?.substring(0, 8) || 'N/A'}...</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm font-semibold ${hasError ? 'text-red-600' : 'text-green-600'}`}>
                {isVerifying ? 'Processing' : hasError ? 'Failed' : 'Debited'}
              </span>
            </div>
            {!hasError && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Deducted From:</span>
                <span className="text-xs font-semibold text-green-600">Your Account</span>
              </div>
            )}
          </div>

          {!hasError && (
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
              <p className="text-xs text-muted-foreground text-center">
                The admin team is reviewing your withdrawal. You will be notified via email when the funds are processed and sent to your wallet.
              </p>
            </div>
          )}

          <Button
            onClick={() => {
              setWithdrawalSuccess(false);
              setCompletedWithdrawal(null);
              if (!hasError) {
                // Navigate back to main dashboard after successful withdrawal
                router.push('/dashboard');
              } else {
                // On error, just close the modal to allow retry
                fetchUserData();
              }
            }}
            className="w-full"
            variant={hasError ? "destructive" : "default"}
          >
            {hasError ? 'Try Again' : 'Back to Dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-4xl px-1 sm:px-2 md:px-0">
      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Verify Withdrawal</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to your email address
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={withdrawalOTP}
                  onChange={(e) => setWithdrawalOTP(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-border rounded-lg text-center text-2xl tracking-widest font-bold bg-background text-foreground"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setShowOTPModal(false);
                    setWithdrawalOTP('');
                    setPendingWithdrawal(null);
                  }}
                  variant="outline"
                  disabled={otpLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyWithdrawalOTP}
                  disabled={otpLoading || withdrawalOTP.length !== 6}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Withdraw'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* KYC Modal */}
      <KYCModal
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        balance={balance}
        onSuccess={() => {
          setKycStatus('pending');
          toast({
            title: 'KYC Submitted',
            description: 'Your KYC is under review. You can withdraw once approved.',
            variant: 'default'
          });
        }}
      />

      {/* Balance Card - Mobile Responsive */}
      <Card className="p-3 sm:p-4 md:p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Available Balance</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Earnings + unlocked funds available for withdrawal</p>
          </div>
          <Wallet className="text-blue-600 flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
        </div>
      </Card>

      {/* KYC Warning if needed */}
      {balance > 300 && kycStatus !== 'approved' && kycStatus !== 'verified' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-amber-700">KYC Verification Required</p>
            <p className="text-xs text-amber-600 mt-1">
              Your balance exceeds $300. KYC verification is required to withdraw funds.
              {kycStatus === 'pending' && ' Your KYC is under review.'}
              {kycStatus === 'rejected' && ' Your KYC was rejected. Please resubmit in Settings.'}
            </p>
          </div>
        </div>
      )}

      {/* Wallet Addresses Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Wallet Addresses</h3>
          <Button
            onClick={() => setShowAddWallet(!showAddWallet)}
            size="sm"
            variant={showAddWallet ? 'default' : 'outline'}
          >
            <Plus size={16} className="mr-2" />
            {showAddWallet ? 'Cancel' : 'Add Wallet'}
          </Button>
        </div>

        {/* Add New Wallet Form */}
        {showAddWallet && (
          <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="walletType">Wallet Type</Label>
              <select
                id="walletType"
                value={newWallet.walletType}
                onChange={(e) => setNewWallet(prev => ({ ...prev, walletType: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="usdt">USDT (ERC-20)</option>
                <option value="usdc">USDC (ERC-20)</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="walletAddress">Wallet Address</Label>
              <Input
                id="walletAddress"
                value={newWallet.walletAddress}
                onChange={(e) => setNewWallet(prev => ({ ...prev, walletAddress: e.target.value }))}
                placeholder="Enter your wallet address"
                disabled={withdrawalLoading}
              />
            </div>

            <Button
              onClick={handleAddWallet}
              disabled={withdrawalLoading}
              className="w-full"
            >
              {withdrawalLoading ? 'Adding...' : 'Add This Wallet'}
            </Button>
          </div>
        )}

        {/* Wallet List */}
        {wallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="text-muted-foreground mx-auto mb-2" size={32} />
            <p className="text-muted-foreground text-sm">No wallet addresses added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet._id}
                onClick={() => setWithdrawalData(prev => ({ ...prev, walletId: wallet._id }))}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  withdrawalData.walletId === wallet._id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground capitalize">{wallet.walletType}</p>
                    <p className="text-sm text-muted-foreground break-all font-mono">
                      {wallet.walletAddress}
                    </p>
                  </div>
                  {withdrawalData.walletId === wallet._id && (
                    <Check className="text-primary flex-shrink-0" size={20} />
                  )}
                </div>
                {wallet.isDefault && (
                  <p className="text-xs text-primary mt-2">Default wallet</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Withdrawal Form */}
      {wallets.length > 0 ? (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Withdraw Funds</h3>

          <div className="space-y-4">
            {/* Currency Selection - USD Only (Crypto) */}
            <div>
              <Label htmlFor="currency">Currency</Label>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-semibold text-foreground">USD ($) - Crypto Only</p>
                <p className="text-xs text-muted-foreground mt-1">All withdrawals are processed in USD crypto</p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (USD)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={balance}
                  step="0.01"
                  value={withdrawalData.amount || ''}
                  onChange={(e) => setWithdrawalData(prev => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0
                  }))}
                  placeholder={`Minimum $${MIN_WITHDRAWAL}`}
                  disabled={withdrawalLoading}
                />
                <Button
                  onClick={() => setWithdrawalData(prev => ({ ...prev, amount: balance }))}
                  variant="outline"
                  disabled={withdrawalLoading}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum: ${MIN_WITHDRAWAL} | Available: ${balance.toFixed(2)}
              </p>

              {/* Withdrawal Fee Breakdown */}
              {withdrawalData.amount > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Withdrawal Amount:</span>
                    <span className="font-semibold text-foreground">${withdrawalData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">2% Crypto Network Fee:</span>
                    <span className="font-semibold text-orange-600">${(withdrawalData.amount * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-orange-500/20 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">You&apos;ll Receive:</span>
                    <span className="text-lg font-bold text-green-600">${(withdrawalData.amount - (withdrawalData.amount * 0.02)).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Withdrawal Method Selection */}
            {wallets.length > 0 && (
              <div className="space-y-3">
                <Label className="font-bold">Withdrawal Method</Label>
                
                {/* Crypto Option */}
                {wallets.length > 0 && withdrawalData.currency === 'USD' && (
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      withdrawalData.walletId
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary hover:bg-primary/2'
                    }`} 
                    onClick={() => setWithdrawalData(prev => ({ ...prev, walletId: wallets[0]._id }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">💰</div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Crypto Wallet (USD)</p>
                        <p className="text-xs text-muted-foreground">Bitcoin, Ethereum, USDT, USDC</p>
                      </div>
                      {withdrawalData.walletId && (
                        <Check className="text-primary" size={20} />
                      )}
                    </div>
                  </div>
                )}

                {/* Info about crypto withdrawals */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p><strong>💡 Note:</strong></p>
                  <p>• All withdrawals are processed in USD via crypto wallet</p>
                  <p>• Supported: Bitcoin, Ethereum, USDT, USDC</p>
                  <p>• Withdrawals are instant and real-time</p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-600">
                <p className="font-semibold mb-1">Processing Time</p>
                <p className="text-xs">Withdrawals are processed within 24-48 hours. Check your activities page for updates.</p>
              </div>
            </div>

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdrawal}
              disabled={
                withdrawalLoading ||
                withdrawalData.amount === 0 ||
                !withdrawalData.walletId ||
                withdrawalData.amount < MIN_WITHDRAWAL ||
                (balance > 300 && kycStatus !== 'approved')
              }
              className="w-full h-11 text-base"
            >
              {withdrawalLoading ? 'Processing...' : `Withdraw $${withdrawalData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8">
            <Wallet className="text-muted-foreground mx-auto mb-2" size={32} />
            <p className="text-muted-foreground text-sm mb-4">No withdrawal methods available</p>
            <p className="text-xs text-muted-foreground">Please add a wallet address or bank account to proceed with withdrawals.</p>
          </div>
        </Card>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Verify Withdrawal</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Enter the 6-digit OTP code sent to your email to confirm your withdrawal request.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="otp-code">OTP Code</Label>
              <Input
                id="otp-code"
                type="text"
                placeholder="000000"
                value={withdrawalOTP}
                onChange={(e) => setWithdrawalOTP(e.target.value.slice(0, 6))}
                maxLength={6}
                disabled={otpLoading}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-muted-foreground text-center">
                Didn't receive? Check spam folder or request a new code.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2">
              <AlertCircle className="text-blue-600 flex-shrink-0" size={18} />
              <p className="text-xs text-blue-600">
                <strong>Security:</strong> Never share your OTP code with anyone. We will never ask for it outside this dialog.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleVerifyWithdrawalOTP}
                disabled={withdrawalOTP.length !== 6 || otpLoading}
                className="w-full h-11"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Withdraw'}
              </Button>
              <Button
                onClick={() => {
                  setShowOTPModal(false);
                  setWithdrawalOTP('');
                }}
                variant="outline"
                disabled={otpLoading}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <Link href='/dashboard' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-6'>
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Withdraw Funds</h1>
          <p className="text-muted-foreground">Manage your wallets and request withdrawals (Minimum: $5)</p>
        </div>

        <WithdrawalPageContent />
      </div>
    </ProtectedRoute>
  );
}
