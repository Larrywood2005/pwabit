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

  const MIN_WITHDRAWAL = 5;

  useEffect(() => {
    if (user) {
      fetchUserData();
      // Refresh balance every 2 hours (7200000ms)
      const balanceInterval = setInterval(fetchUserData, 7200000);
      return () => clearInterval(balanceInterval);
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get auth token from localStorage (key is 'auth_token', not 'token')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      const [userData, walletsData, kycData, balanceData] = await Promise.all([
        apiClient.getUserProfile(),
        apiClient.getUserWallets(),
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
      setWallets(walletsData.wallets || []);
      setKycStatus(kycData.status || 'not-submitted');

      // Set default wallet if available
      const defaultWallet = walletsData.wallets?.find((w: any) => w.isDefault);
      if (defaultWallet) {
        setWithdrawalData(prev => ({ ...prev, walletId: defaultWallet._id }));
      }
    } catch (error) {
      console.error('[v0] Fetch user data error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawal information',
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
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to add wallet address';
      console.error('[v0] Add wallet error:', errorMessage);
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

    // Check KYC if balance is over $300
    if (balance > 300 && kycStatus !== 'approved') {
      setShowKYCModal(true);
      return;
    }

    try {
      setWithdrawalLoading(true);
      
      // First, request OTP for withdrawal security
      console.log('[v0] Requesting withdrawal OTP');
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

      console.log('[v0] Withdrawal OTP requested, awaiting verification');
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to request withdrawal OTP. Please try again.';
      console.error('[v0] Withdrawal OTP request error:', errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyWithdrawalOTP = async () => {
    if (!withdrawalOTP.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the OTP code',
        variant: 'destructive'
      });
      return;
    }

    try {
      setOtpLoading(true);
      
      // Verify OTP
      console.log('[v0] Verifying withdrawal OTP');
      await apiClient.post('/auth/verify-otp', {
        otp: withdrawalOTP,
        type: 'withdrawal'
      });
      
      // OTP verified, now process the withdrawal
      if (pendingWithdrawal) {
        const withdrawalPayload = {
          amount: pendingWithdrawal.amount,
          currency: pendingWithdrawal.currency,
          method: pendingWithdrawal.method
        };
        
        if (pendingWithdrawal.walletId) {
          withdrawalPayload.walletId = pendingWithdrawal.walletId;
        }
        
        console.log('[v0] Processing verified withdrawal:', withdrawalPayload);
        const response = await apiClient.post('/withdrawals', withdrawalPayload);
        
        console.log('[v0] Withdrawal processed successfully');

        toast({
          title: 'Success',
          description: `Your withdrawal of ${pendingWithdrawal.currency === 'USD' ? '$' : '₦'}${pendingWithdrawal.amount.toLocaleString()} has been submitted!`,
          variant: 'default'
        });

        // Reset form and close modal
        setShowOTPModal(false);
        setWithdrawalOTP('');
        setPendingWithdrawal(null);
        setWithdrawalData({ amount: 0, currency: 'USD', walletId: '' });
        
        // Refresh data in real-time
        await fetchUserData();
        setTimeout(() => fetchUserData(), 2000);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to verify OTP. Please try again.';
      console.error('[v0] OTP verification error:', errorMessage);
      toast({
        title: 'Verification Error',
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
      {balance > 300 && kycStatus !== 'approved' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-amber-700">KYC Verification Required</p>
            <p className="text-xs text-amber-600 mt-1">
              Your balance exceeds $300. KYC verification is required to withdraw funds.
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
