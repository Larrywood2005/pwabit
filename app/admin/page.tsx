'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Wallet, CheckCircle, AlertTriangle, TrendingUp, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PendingDepositCard } from '@/components/PendingDepositCard';
import { UserManagement } from '@/components/UserManagement';
import { AdminUserDetailsModal } from '@/components/AdminUserDetailsModal';
import { GrantPowaUpByCodeModal } from '@/components/GrantPowaUpByCodeModal';
import { AdminChatMessagesModal } from '@/components/AdminChatMessagesModal';
import { io } from 'socket.io-client';

interface AdminStats {
  totalUsers?: number;
  totalInvested?: number | string;
  totalEarnings?: number | string;
  totalPlatformBalance?: number | string;
  verifiedUsers?: number;
  kycVerifiedUsers?: number;
  pendingKYC?: number;
  financialSummary?: {
    totalInvestedCapital?: number | string;
    totalEarningsFromInvestments?: number | string;
    totalCurrentBalance?: number | string;
    note?: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { admin, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats>({});
  const [users, setUsers] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'receipts' | 'kyc' | 'games' | 'withdrawals' | 'users'>('overview');
  const [processingTransactions, setProcessingTransactions] = useState<{[key: string]: boolean}>({});
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([]);
  const [gameRewards, setGameRewards] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('pending');
  const [flaggedUsers, setFlaggedUsers] = useState<any[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<any[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<any[]>([]);
  const [userManagementFilter, setUserManagementFilter] = useState<'all' | 'flagged' | 'suspended' | 'deleted'>('all');
  const [allActiveUsers, setAllActiveUsers] = useState<any[]>([]);
  const [selectedUserForAction, setSelectedUserForAction] = useState<any>(null);
  const [userActionReason, setUserActionReason] = useState('');
  const [userActionType, setUserActionType] = useState<'flag' | 'suspend' | 'delete' | 'restore'>('flag');
  const [userWalletAddresses, setUserWalletAddresses] = useState<any[]>([]);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<string | null>(null);
  const [showGrantPowaUpByCode, setShowGrantPowaUpByCode] = useState(false);
  const [showChatMessages, setShowChatMessages] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch stats
        const statsData = await apiClient.getAdminStats();
        setStats(statsData || {});

        // Fetch users
        const usersData = await apiClient.getAdminUsers(1, 5);
        setUsers(usersData.users || []);

        // Fetch pending deposits
        const depositsData = await apiClient.getPendingDeposits();
        setPendingDeposits(Array.isArray(depositsData) ? depositsData : []);

        // Fetch payment receipts pending verification
        try {
          const receiptsData = await apiClient.getPendingPaymentReceipts();
          setPaymentReceipts(Array.isArray(receiptsData) ? receiptsData : []);
        } catch (e) {
          console.error('[v0] Error fetching payment receipts:', e);
        }

        // Fetch pending KYC
        const kycData = await apiClient.getPendingKYC();
        setPendingKYC(Array.isArray(kycData) ? kycData : []);

        // Fetch game rewards
        try {
          const rewardsData = await apiClient.getAdminGameRewards();
          setGameRewards(Array.isArray(rewardsData) ? rewardsData : []);
        } catch (e) {
          console.error('[v0] Error fetching game rewards:', e);
        }

        // Fetch all withdrawals (pending, processing, and completed)
        try {
          const withdrawalsData = await apiClient.getPendingWithdrawals();
          setAllWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
          // Also set pending for backward compatibility if needed
          setPendingWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
        } catch (e) {
          console.error('[v0] Error fetching withdrawals:', e);
        }

        // Fetch all user wallet addresses for admin
        try {
          const walletData = await apiClient.getAdminAllWalletAddresses();
          setUserWalletAddresses(walletData?.data || []);
        } catch (e) {
          console.error('[v0] Error fetching user wallet addresses:', e);
        }

        // Fetch flagged users
        try {
          const flaggedData = await apiClient.getUsersByStatus('flagged', 50, 1);
          setFlaggedUsers(flaggedData.users || []);
        } catch (e) {
          console.error('[v0] Error fetching flagged users:', e);
        }

        // Fetch suspended users
        try {
          const suspendedData = await apiClient.getUsersByStatus('suspended', 50, 1);
          setSuspendedUsers(suspendedData.users || []);
        } catch (e) {
          console.error('[v0] Error fetching suspended users:', e);
        }

        // Fetch deleted users
        try {
          const deletedData = await apiClient.getUsersByStatus('deleted', 50, 1);
          setDeletedUsers(deletedData.users || []);
        } catch (e) {
          console.error('[v0] Error fetching deleted users:', e);
        }

        // Fetch all active users for monitoring
        try {
          const allUsersData = await apiClient.getAdminUsers(1, 100);
          setAllActiveUsers(allUsersData.users || []);
        } catch (e) {
          console.error('[v0] Error fetching all users:', e);
        }
      } catch (err: any) {
        console.error('[v0] Error fetching admin data:', err);
        
        // Provide helpful error message based on error type
        let errorMsg = 'Failed to load dashboard data';
        if (err.status === 403) {
          errorMsg = 'Unauthorized: You do not have admin access. Verify your credentials.';
        } else if (err.message?.includes('ERR_CONNECTION_REFUSED') || err.message?.includes('Cannot reach')) {
          errorMsg = 'Backend server is not running. Start the backend with: cd backend && npm start';
        } else if (err.status === 404) {
          errorMsg = 'API endpoint not found. Ensure backend server is running.';
        } else if (err.message) {
          errorMsg = err.message;
        }
        
        setError(errorMsg);
        console.error('[v0] Admin dashboard error summary:', {
          status: err.status,
          message: errorMsg,
          isBackendDown: errorMsg.includes('Backend server'),
        });
      } finally {
        setLoading(false);
      }
    };

    if (admin) {
      fetchData();
      
      // Initialize Socket.io for real-time withdrawal updates with fallback mechanisms
      // Use base URL only - Socket.IO handles default path
      const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');
      
      const socket = io(backendUrl, {
        auth: {
          token: localStorage.getItem('auth_token')
        },
        transports: ['websocket', 'polling'], // WebSocket first, polling as fallback
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      socket.on('connect', () => {
        console.log('[v0] Admin Socket connected');
        // Join admin room for withdrawal updates
        const adminId = admin._id || admin.id;
        if (adminId) {
          socket.emit('join-admin', adminId);
        }
      });

      socket.on('connect_error', (error) => {
        console.warn('[v0] Admin socket connection error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('[v0] Admin socket disconnected:', reason);
      });

      // Listen for real-time withdrawal creation
      socket.on('withdrawal-created', (withdrawal) => {
        console.log('[v0] New withdrawal created in real-time:', withdrawal);
        setAllWithdrawals(prev => [withdrawal, ...prev]);
        setPendingWithdrawals(prev => {
          if (withdrawal.status === 'pending') {
            return [withdrawal, ...prev];
          }
          return prev;
        });
      });

      // Listen for real-time withdrawal completion
      socket.on('withdrawal-completed', (withdrawal) => {
        console.log('[v0] Withdrawal completed in real-time:', withdrawal);
        // Update all withdrawals list
        setAllWithdrawals(prev => {
          const index = prev.findIndex(w => w._id === withdrawal._id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = withdrawal;
            return updated;
          }
          return [withdrawal, ...prev];
        });
        
        // Remove from pending (if it's completed) or update
        setPendingWithdrawals(prev => {
          if (withdrawal.status === 'completed') {
            return prev.filter(w => w._id !== withdrawal._id);
          }
          return prev.map(w => w._id === withdrawal._id ? withdrawal : w);
        });
        
        // Show success notification in admin dashboard
        setSuccessMessage(`Withdrawal ${withdrawal._id?.substring(0, 8) || ''} completed - User funds debited: $${withdrawal.amount?.toFixed(2) || '0.00'}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      });

      // Listen for real-time withdrawal status updates
      socket.on('withdrawal-updated', (withdrawal) => {
        console.log('[v0] Withdrawal updated in real-time:', withdrawal);
        setAllWithdrawals(prev =>
          prev.map(w => w._id === withdrawal._id ? withdrawal : w)
        );
        setPendingWithdrawals(prev =>
          prev.map(w => w._id === withdrawal._id ? withdrawal : w).filter(w => w.status === 'pending')
        );
      });

      // Listen for KYC updates - TASK 5: Real-time verified users count
      socket.on('kyc-updated', (kycData: any) => {
        console.log('[v0] KYC updated in real-time:', kycData);
        // Refresh pending KYC list
        const kycData_data = kycData?.data || [kycData];
        setPendingKYC(prev => prev.filter(k => k._id !== kycData._id));
        // Update stats - increment/decrement verified users
        setStats(prev => ({
          ...prev,
          verifiedUsers: (prev.verifiedUsers || 0) + (kycData.status === 'verified' ? 1 : 0),
          pendingKYC: Math.max(0, (prev.pendingKYC || 0) - 1)
        }));
      });

      // Refresh data every 1 minute for fallback only - DO NOT use more frequent refresh
      const interval = setInterval(fetchData, 60000);
      
      return () => {
        socket.disconnect();
        clearInterval(interval);
      };
    }
  }, [admin]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleConfirmDeposit = async (transactionId: string) => {
    try {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: true }));
      const result = await apiClient.confirmDeposit(transactionId);
      
      // Show real-time activation feedback
      if (result.transaction?.investmentActivated) {
        setSuccessMessage(`Deposit confirmed! Investment activated in real-time - User can now trade immediately!`);
      } else {
        setSuccessMessage('Deposit confirmed successfully!');
      }
      
      setTimeout(() => setSuccessMessage(''), 5000);
      // Refresh data
      const depositsData = await apiClient.getPendingDeposits();
      setPendingDeposits(Array.isArray(depositsData) ? depositsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm deposit');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: false }));
    }
  };

  const handleVerifyKYC = async (kycId: string, approved: boolean) => {
    try {
      setProcessingTransactions(prev => ({ ...prev, [kycId]: true }));
      // Call the correct API endpoint with kycId instead of userId
      await apiClient.verifyKYC(kycId, approved, approved ? 'Approved by admin' : 'Rejected by admin');
      setSuccessMessage(`KYC ${approved ? 'approved' : 'rejected'} successfully! User can now ${approved ? 'trade and withdraw' : 'resubmit documents'}!`);
      setTimeout(() => setSuccessMessage(''), 5000);
      // Refresh KYC data immediately
      const kycData = await apiClient.getPendingKYC();
      setPendingKYC(Array.isArray(kycData?.data) ? kycData.data : []);
      console.log('[v0] KYC list refreshed after approval/rejection');
    } catch (err: any) {
      console.error('[v0] KYC verification error:', err);
      setError(err.message || 'Failed to process KYC');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [kycId]: false }));
    }
  };

  const handleUpdateWithdrawalStatus = async (transactionId: string, newStatus: 'pending' | 'processing' | 'completed', paymentMethod?: string, paymentNotes?: string) => {
    try {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: true }));
      await apiClient.updateWithdrawalStatus(transactionId, { newStatus, paymentMethod, paymentNotes });
      setSuccessMessage(`Withdrawal marked as ${newStatus}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      // Refresh withdrawals in real-time
      const withdrawalsData = await apiClient.getPendingWithdrawals();
      setAllWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
      setPendingWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to update withdrawal status');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: false }));
    }
  };

  const handleUserAction = async (userId: string, actionType: 'flag' | 'suspend' | 'delete', reason: string) => {
    try {
      setProcessingTransactions(prev => ({ ...prev, [userId]: true }));
      
      if (actionType === 'flag') {
        await apiClient.flagUser(userId, reason);
        setSuccessMessage('User flagged successfully!');
      } else if (actionType === 'suspend') {
        await apiClient.suspendUser(userId, reason);
        setSuccessMessage('User suspended successfully!');
      } else if (actionType === 'delete') {
        await apiClient.deleteUser(userId, reason);
        setSuccessMessage('User deleted successfully!');
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
      setSelectedUserForAction(null);
      setUserActionReason('');
      
      // Refresh users
      const flaggedData = await apiClient.getUsersByStatus('flagged', 50, 1);
      setFlaggedUsers(flaggedData.users || []);
      const suspendedData = await apiClient.getUsersByStatus('suspended', 50, 1);
      setSuspendedUsers(suspendedData.users || []);
      const deletedData = await apiClient.getUsersByStatus('deleted', 50, 1);
      setDeletedUsers(deletedData.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to perform user action');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      setProcessingTransactions(prev => ({ ...prev, [userId]: true }));
      await apiClient.restoreUser(userId, 'Restored by admin');
      setSuccessMessage('User restored successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh users
      const flaggedData = await apiClient.getUsersByStatus('flagged', 50, 1);
      setFlaggedUsers(flaggedData.users || []);
      const suspendedData = await apiClient.getUsersByStatus('suspended', 50, 1);
      setSuspendedUsers(suspendedData.users || []);
      const deletedData = await apiClient.getUsersByStatus('deleted', 50, 1);
      setDeletedUsers(deletedData.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to restore user');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRejectDeposit = async (transactionId: string, reason: string) => {
    if (!reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: true }));
      
      // Call backend API to reject deposit
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/reject-deposit/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject deposit');
      }

      setSuccessMessage('Deposit rejected successfully! User has been notified.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh pending deposits list
      const depositsData = await apiClient.getPendingDeposits();
      setPendingDeposits(Array.isArray(depositsData) ? depositsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to reject deposit');
    } finally {
      setProcessingTransactions(prev => ({ ...prev, [transactionId]: false }));
    }
  };

  const formatCurrency = (value: number | string | undefined): string => {
    if (typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : `$${num.toFixed(2)}`;
    }
    return '$0.00';
  };

  const statsCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers?.toLocaleString() || '0', change: '+125 this month' },
    { 
      icon: Wallet, 
      label: 'Total Invested Capital', 
      value: formatCurrency(stats.totalInvested),
      change: '100% Withdrawable by Users' 
    },
    { 
      icon: TrendingUp, 
      label: 'Total Earnings Generated', 
      value: formatCurrency(stats.totalEarnings),
      change: 'From active investments' 
    },
    { 
      icon: CheckCircle, 
      label: 'Platform Total Balance', 
      value: formatCurrency(stats.totalPlatformBalance),
      change: 'Current balance on platform' 
    },
  ];

  return (
    <ProtectedRoute requireAdmin>
      <div className='space-y-4 md:space-y-8 px-2 md:px-0'>
        {/* Header */}
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-3 md:gap-4'>
            <img 
              src='/logo.svg' 
              alt='PowaBitz' 
              className='w-10 h-10 md:w-12 md:h-12 object-contain'
            />
            <div>
              <h1 className='text-xl md:text-3xl font-bold text-foreground'>Admin Dashboard</h1>
              <p className='text-xs md:text-base text-muted-foreground mt-1 md:mt-2'>Welcome, {admin?.fullName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='self-end md:self-auto px-4 md:px-6 py-2 rounded-lg border border-border text-foreground hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 transition-colors flex items-center gap-2 text-sm md:text-base'
          >
            <LogOut size={16} className='md:w-[18px] md:h-[18px]' />
            Logout
          </button>
        </div>

        {/* Error Message */}
      {error && (
        <div className='p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm space-y-2'>
          <div className='flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 flex-shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='font-semibold'>{error}</p>
              {error.includes('Backend server') && (
                <p className='text-xs mt-2 opacity-90'>
                  Start backend: <code className='bg-red-500/20 px-2 py-1 rounded'>cd backend && npm start</code>
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError('');
                window.location.reload();
              }}
              className='flex-shrink-0 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors text-xs font-semibold'
            >
              Retry
            </button>
          </div>
        </div>
      )}

        {/* Success Message */}
        {successMessage && (
          <div className='p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm'>
            {successMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex flex-wrap gap-2 md:gap-4 mb-4'>
          <button
            onClick={() => setShowGrantPowaUpByCode(true)}
            className='px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-sm'
          >
            🎁 Grant PowaUp by Code
          </button>
          <button
            onClick={() => setShowChatMessages(true)}
            className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-sm'
          >
            💬 View User Messages
          </button>
        </div>

        {/* Admin Tabs */}
        <div className='flex gap-1 md:gap-4 border-b border-border overflow-x-auto pb-1 -mx-2 px-2 md:mx-0 md:px-0'>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className='hidden sm:inline'>Pending </span>Deposits
            {pendingDeposits.length > 0 && (
              <span className='px-1.5 md:px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 text-[10px] md:text-xs font-bold'>
                {pendingDeposits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className='hidden sm:inline'>Payment </span>Receipts
            {paymentReceipts.length > 0 && (
              <span className='px-1.5 md:px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 text-[10px] md:text-xs font-bold'>
                {paymentReceipts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
              activeTab === 'kyc'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            KYC
            {pendingKYC.length > 0 && (
              <span className='px-1.5 md:px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 text-[10px] md:text-xs font-bold'>
                {pendingKYC.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'games'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Withdrawals
            {pendingWithdrawals.length > 0 && (
              <span className='px-1.5 md:px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-[10px] md:text-xs font-bold'>
                {pendingWithdrawals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 md:px-6 py-2 md:py-3 text-xs md:text-base font-semibold border-b-2 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Users
            {(flaggedUsers.length + suspendedUsers.length + deletedUsers.length) > 0 && (
              <span className='px-1.5 md:px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 text-[10px] md:text-xs font-bold'>
                {flaggedUsers.length + suspendedUsers.length + deletedUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-gray-600'>Loading dashboard data...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* Key Metrics */}
                <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6'>
              {statsCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className='p-3 md:p-6 rounded-lg bg-card border border-border hover:border-primary transition-all'>
                    <div className='flex items-center justify-between mb-2 md:mb-4'>
                      <Icon className='text-primary w-5 h-5 md:w-6 md:h-6' />
                    </div>
                    <p className='text-muted-foreground text-xs md:text-sm mb-1'>{stat.label}</p>
                    <p className='text-lg md:text-2xl font-bold text-foreground'>{stat.value}</p>
                    <p className='text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2 hidden sm:block'>{stat.change}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent Users */}
            <div className='rounded-lg bg-card border border-border'>
              <div className='p-4 md:p-6 border-b border-border flex items-center justify-between'>
                <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                  <Users className='text-primary w-4 h-4 md:w-5 md:h-5' />
                  Recent Users
                </h2>
                <span className='px-2 md:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs md:text-sm font-bold'>
                  {users.length}
                </span>
              </div>

              {/* Mobile Card View */}
              <div className='md:hidden divide-y divide-border'>
                {users.length > 0 ? (
                  users.map((user: any) => (
                    <div key={user.id} className='p-4'>
                      <div className='flex items-center justify-between mb-2'>
                        <p className='font-semibold text-foreground text-sm'>{user.fullName || 'N/A'}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          user.status === 'verified' 
                            ? 'bg-green-500/20 text-green-600' 
                            : 'bg-yellow-500/20 text-yellow-600'
                        }`}>
                          {user.status || 'pending'}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground mb-1'>{user.email}</p>
                      <p className='text-[10px] text-muted-foreground'>Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  ))
                ) : (
                  <div className='p-4 text-center text-muted-foreground text-sm'>No users found</div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-border bg-muted/50'>
                      <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Name</th>
                      <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Email</th>
                      <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Status</th>
                      <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user: any) => (
                        <tr key={user.id} className='border-b border-border hover:bg-muted/50 transition-colors'>
                          <td className='px-6 py-4 text-sm text-foreground'>{user.fullName || 'N/A'}</td>
                          <td className='px-6 py-4 text-sm text-muted-foreground'>{user.email}</td>
                          <td className='px-6 py-4 text-sm'>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.status === 'verified' 
                                ? 'bg-green-500/20 text-green-600' 
                                : 'bg-yellow-500/20 text-yellow-600'
                            }`}>
                              {user.status || 'pending'}
                            </span>
                          </td>
                          <td className='px-6 py-4 text-sm text-muted-foreground'>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className='px-6 py-4 text-center text-muted-foreground'>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Stats */}
            <div className='grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6'>
              <div className='p-4 md:p-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-border'>
                <p className='text-muted-foreground text-xs md:text-sm mb-1 md:mb-2'>KYC Pending</p>
                <p className='text-xl md:text-3xl font-bold text-primary'>{stats.pendingKYC || 0}</p>
                <p className='text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2'>Awaiting verification</p>
              </div>

              <div className='p-6 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 border border-border'>
                <p className='text-muted-foreground text-sm mb-2'>Platform Status</p>
                <div className='flex items-center gap-2'>
                  <div className='w-3 h-3 rounded-full bg-green-500 animate-pulse'></div>
                  <p className='text-lg font-bold text-foreground'>All Systems Operational</p>
                </div>
                <p className='text-xs text-muted-foreground mt-2'>Last updated: just now</p>
              </div>
            </div>
              </>
            )}

            {/* PENDING DEPOSITS TAB */}
            {activeTab === 'deposits' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                    <Wallet className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    Pending Deposits with Receipts
                  </h2>
                </div>
                {pendingDeposits.length > 0 ? (
                  <div className='divide-y divide-border p-4 md:p-6 space-y-4'>
                    {pendingDeposits.map((deposit: any) => (
                      <PendingDepositCard
                        key={deposit._id}
                        investment={deposit}
                        onConfirm={(id) => handleConfirmDeposit(id)}
                        onReject={(id, reason) => handleRejectDeposit(id, reason)}
                        isProcessing={processingTransactions[deposit._id] || false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                    No pending deposits with receipts at the moment
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT RECEIPTS TAB */}
            {activeTab === 'receipts' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                    <CheckCircle className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    Payment Receipts
                  </h2>
                </div>
                {paymentReceipts.length > 0 ? (
                  <div className='divide-y divide-border p-4 md:p-6 space-y-4'>
                    {paymentReceipts.map((receipt: any) => (
                      <div key={receipt._id || receipt.id} className='p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors'>
                        <div className='grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4'>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>User</p>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{receipt.userId?.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground'>{receipt.userId?.email}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Amount</p>
                            <p className='font-bold text-base md:text-lg text-foreground'>${receipt.amount?.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Status</p>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              receipt.status === 'verified' ? 'bg-green-500/20 text-green-600' :
                              receipt.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                              'bg-red-500/20 text-red-600'
                            }`}>
                              {receipt.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                        </div>
                        <p className='text-xs text-muted-foreground mb-3'>
                          Reference: {receipt.reference || receipt._id?.substring(0, 8) || 'N/A'}
                        </p>
                        {receipt.status === 'pending' && (
                          <div className='flex flex-wrap gap-2'>
                            <button
                              onClick={() => handleConfirmDeposit(receipt._id)}
                              disabled={processingTransactions[receipt._id]}
                              className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                            >
                              {processingTransactions[receipt._id] ? '...' : 'Verify'}
                            </button>
                            <button
                              onClick={() => handleRejectDeposit(receipt._id, 'Invalid receipt')}
                              disabled={processingTransactions[receipt._id]}
                              className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                            >
                              {processingTransactions[receipt._id] ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                    No payment receipts to review
                  </div>
                )}
              </div>
            )}

            {/* GAME REWARDS TAB */}
            {activeTab === 'games' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                    <TrendingUp className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    Game Rewards
                  </h2>
                </div>
                {gameRewards.length > 0 ? (
                  <>
                    {/* Mobile Card View */}
                    <div className='md:hidden divide-y divide-border'>
                      {gameRewards.map((reward: any) => (
                        <div key={reward._id} className='p-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <p className='font-semibold text-foreground text-sm'>{reward.userId?.fullName || 'Unknown'}</p>
                            <span className='font-semibold text-green-600 text-sm'>${reward.amount?.toFixed(2)}</span>
                          </div>
                          <div className='flex items-center justify-between text-xs text-muted-foreground'>
                            <span className='capitalize'>{reward.rewardType}</span>
                            <span>{new Date(reward.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop Table View */}
                    <div className='hidden md:block overflow-x-auto'>
                      <table className='w-full'>
                        <thead>
                          <tr className='border-b border-border bg-muted/50'>
                            <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>User</th>
                            <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Game Type</th>
                            <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Amount</th>
                            <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Date</th>
                            <th className='px-6 py-3 text-left text-sm font-semibold text-foreground'>Streak</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameRewards.map((reward: any) => (
                            <tr key={reward._id} className='border-b border-border hover:bg-muted/50 transition-colors'>
                              <td className='px-6 py-4 text-sm text-foreground'>{reward.userId?.fullName || 'Unknown'}</td>
                              <td className='px-6 py-4 text-sm capitalize text-foreground'>{reward.rewardType}</td>
                              <td className='px-6 py-4 text-sm font-semibold text-green-600'>${reward.amount?.toFixed(2)}</td>
                              <td className='px-6 py-4 text-sm text-muted-foreground'>{new Date(reward.date).toLocaleDateString()}</td>
                              <td className='px-6 py-4 text-sm text-muted-foreground'>{reward.streak || 0} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                    No game rewards yet
                  </div>
                )}
              </div>
            )}

            {/* KYC VERIFICATION TAB */}
            {activeTab === 'kyc' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2'>
                    <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                      <CheckCircle className='text-primary w-4 h-4 md:w-5 md:h-5' />
                      KYC Verification Records ({pendingKYC.length})
                    </h2>
                  </div>
                  <p className='text-xs md:text-sm text-muted-foreground mt-2'>Review and manage all KYC submissions (pending, approved, rejected)</p>
                </div>
                
                {/* KYC Status Filter */}
                <div className='p-3 md:p-4 border-b border-border flex gap-2 overflow-x-auto'>
                  {(['pending', 'approved', 'rejected'] as const).map((status) => (
                    <button
                      key={status}
                      className={`px-2 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                        status === 'pending'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      disabled
                      title='KYC filter shows pending only. Approved/Rejected are archived.'
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)} ({status === 'pending' ? pendingKYC.length : '—'})
                    </button>
                  ))}
                </div>
                
                {pendingKYC.length > 0 ? (
                  <div className='divide-y divide-border p-4 md:p-6 space-y-4'>
                    {pendingKYC.map((kyc: any) => (
                      <div key={kyc._id} className='p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors'>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6'>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>User</p>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{kyc.userId?.fullName || kyc.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground'>{kyc.userId?.email}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Full Name</p>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{kyc.fullName}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Date of Birth</p>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Status</p>
                            <span className='px-2 md:px-3 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-600'>
                              {kyc.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                        </div>
                        
                        {kyc.identityPhoto && (
                          <div className='mb-4 md:mb-6'>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-2'>Identity Photo</p>
                            <div className='w-full md:w-48 h-32 md:h-40 rounded border border-border overflow-hidden bg-muted'>
                              <img 
                                src={kyc.identityPhoto} 
                                alt='Identity' 
                                className='w-full h-full object-cover'
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="gray" viewBox="0 0 24 24"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Error%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className='mb-4 md:mb-6'>
                          <p className='text-xs md:text-sm text-muted-foreground mb-1'>Submitted: {new Date(kyc.submittedAt).toLocaleDateString()} at {new Date(kyc.submittedAt).toLocaleTimeString()}</p>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                          <button
                            onClick={() => handleVerifyKYC(kyc._id, true)}
                            disabled={processingTransactions[kyc._id]}
                            className='flex-1 md:flex-none px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[kyc._id] ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleVerifyKYC(kyc._id, false)}
                            disabled={processingTransactions[kyc._id]}
                            className='flex-1 md:flex-none px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[kyc._id] ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-8 md:p-12 text-center'>
                    <CheckCircle className='w-12 h-12 md:w-16 md:h-16 text-green-500/30 mx-auto mb-3 md:mb-4' />
                    <p className='text-sm md:text-base text-muted-foreground font-semibold'>All KYC requests approved!</p>
                    <p className='text-xs md:text-sm text-muted-foreground mt-1'>No pending KYC submissions to review</p>
                  </div>
                )}
              </div>
            )}

            {/* WITHDRAWALS TAB */}
            {activeTab === 'withdrawals' && (
              <div className='space-y-4 md:space-y-6'>
                {/* Withdrawal Requests */}
                <div className='rounded-lg bg-card border border-border'>
                  <div className='p-4 md:p-6 border-b border-border'>
                    <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2 mb-3 md:mb-4'>
                      <Wallet className='text-primary w-4 h-4 md:w-5 md:h-5' />
                      Withdrawal Requests
                    </h2>
                    <div className='flex gap-2 overflow-x-auto pb-1'>
                      {['pending', 'processing', 'completed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setWithdrawalFilter(status as any)}
                          className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                            withdrawalFilter === status
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {allWithdrawals.length > 0 ? (
                    <div className='divide-y divide-border'>
                      {allWithdrawals.filter((withdrawal: any) => {
                        // Match withdrawal status OR withdrawalStatus field
                        const status = withdrawal.withdrawalStatus || withdrawal.status;
                        return status === withdrawalFilter;
                      }).map((withdrawal: any) => {
                        // Find user's wallet addresses
                        const userWallets = userWalletAddresses.filter(
                          (w: any) => w.userId?._id === withdrawal.userId?._id || w.userId === withdrawal.userId?._id
                        );
                        return (
                          <div key={withdrawal._id} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4'>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>User</p>
                                <p className='font-semibold text-foreground text-sm md:text-base'>{withdrawal.userId?.fullName || 'Unknown'}</p>
                                <p className='text-xs md:text-sm text-muted-foreground truncate'>{withdrawal.userId?.email}</p>
                              </div>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Amount</p>
                                <p className='font-bold text-base md:text-lg text-foreground'>${withdrawal.amount?.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Wallet Type</p>
                                <p className='font-semibold text-foreground text-sm uppercase'>{withdrawal.walletType || 'N/A'}</p>
                              </div>
                              <div className='col-span-2 md:col-span-1'>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Wallet Address</p>
                                <p className='font-mono text-[10px] md:text-xs text-foreground break-all bg-muted/50 p-1.5 rounded'>{withdrawal.walletAddress || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Show user's registered wallet addresses */}
                            {userWallets.length > 0 && (
                              <div className='mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
                                <p className='text-[10px] md:text-xs text-blue-600 font-semibold mb-2'>User&apos;s Registered Wallets:</p>
                                <div className='space-y-1'>
                                  {userWallets.map((wallet: any) => (
                                    <div key={wallet._id} className='flex items-center gap-2 text-[10px] md:text-xs'>
                                      <span className='px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-600 font-semibold uppercase'>{wallet.walletType}</span>
                                      <span className='font-mono text-foreground break-all'>{wallet.walletAddress}</span>
                                      {wallet.isDefault && <span className='px-1.5 py-0.5 bg-green-500/20 rounded text-green-600 text-[9px]'>Default</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className='flex flex-wrap gap-2'>
                              <button
                                onClick={() => handleUpdateWithdrawalStatus(withdrawal._id, 'processing')}
                                disabled={processingTransactions[withdrawal._id] || withdrawal.status === 'processing'}
                                className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                              >
                                {processingTransactions[withdrawal._id] ? '...' : 'Mark Processing'}
                              </button>
                              <button
                                onClick={() => handleUpdateWithdrawalStatus(withdrawal._id, 'completed')}
                                disabled={processingTransactions[withdrawal._id] || withdrawal.status === 'completed'}
                                className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                              >
                                {processingTransactions[withdrawal._id] ? '...' : 'Mark Paid Out'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                      No withdrawal requests in this status
                    </div>
                  )}
                </div>

                {/* All User Wallet Addresses Section */}
                <div className='rounded-lg bg-card border border-border'>
                  <div className='p-4 md:p-6 border-b border-border'>
                    <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                      <Wallet className='text-purple-500 w-4 h-4 md:w-5 md:h-5' />
                      All User Wallet Addresses ({userWalletAddresses.length})
                    </h2>
                    <p className='text-xs md:text-sm text-muted-foreground mt-1'>Registered wallet addresses for withdrawals</p>
                  </div>

                  {userWalletAddresses.length > 0 ? (
                    <div className='divide-y divide-border max-h-96 overflow-y-auto'>
                      {userWalletAddresses.map((wallet: any) => (
                        <div key={wallet._id} className='p-4 md:p-5 hover:bg-muted/50 transition-colors'>
                          <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 mb-1'>
                                <p className='font-semibold text-foreground text-sm'>{wallet.userId?.fullName || wallet.userId?.email || 'Unknown User'}</p>
                                {wallet.isDefault && (
                                  <span className='px-2 py-0.5 bg-green-500/20 text-green-600 text-[10px] md:text-xs rounded font-semibold'>Default</span>
                                )}
                              </div>
                              <p className='text-xs text-muted-foreground mb-2'>{wallet.userId?.email}</p>
                              <div className='flex items-center gap-2'>
                                <span className='px-2 py-1 bg-purple-500/20 text-purple-600 rounded text-xs font-semibold uppercase'>{wallet.walletType}</span>
                                <span className='font-mono text-xs text-foreground break-all bg-muted/50 px-2 py-1 rounded'>{wallet.walletAddress}</span>
                              </div>
                            </div>
                            <div className='text-right flex-shrink-0'>
                              <p className='text-[10px] text-muted-foreground'>Added</p>
                              <p className='text-xs text-foreground'>{new Date(wallet.addedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                      No wallet addresses registered by users yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WITHDRAWALS TAB */}
            {activeTab === 'withdrawals' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                    <TrendingUp className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    Withdrawal Requests ({allWithdrawals.length})
                  </h2>
                  <p className='text-xs md:text-sm text-muted-foreground mt-2'>View and manage all withdrawal requests in real-time</p>
                </div>
                
                {/* Filter Buttons */}
                <div className='p-4 md:p-6 border-b border-border flex gap-2 overflow-x-auto'>
                  {(['pending', 'processing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setWithdrawalFilter(status)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                        withdrawalFilter === status
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)} (
                      {allWithdrawals.filter(w => w.status === status || w.withdrawalStatus === status).length})
                    </button>
                  ))}
                  <button
                    onClick={() => setWithdrawalFilter('all')}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                      withdrawalFilter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    All ({allWithdrawals.length})
                  </button>
                </div>

                {allWithdrawals.length > 0 ? (
                  <div className='divide-y divide-border p-4 md:p-6 space-y-4'>
                    {allWithdrawals
                      .filter(w => withdrawalFilter === 'all' || w.status === withdrawalFilter || w.withdrawalStatus === withdrawalFilter)
                      .map((withdrawal: any) => {
                        const status = withdrawal.status || withdrawal.withdrawalStatus || 'pending';
                        const statusColor = status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' 
                          : status === 'processing' ? 'bg-blue-500/20 text-blue-600'
                          : 'bg-green-500/20 text-green-600';
                        
                        return (
                          <div key={withdrawal._id} className='p-4 md:p-6 rounded-lg border border-border hover:bg-muted/50 transition-colors'>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6'>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>User</p>
                                <p className='font-semibold text-foreground text-sm md:text-base'>{withdrawal.userId?.fullName || 'Unknown'}</p>
                                <p className='text-xs md:text-sm text-muted-foreground'>{withdrawal.userId?.email}</p>
                              </div>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Amount</p>
                                <p className='font-bold text-foreground text-sm md:text-base'>${withdrawal.amount?.toFixed(2) || '0.00'}</p>
                              </div>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Wallet Type</p>
                                <p className='font-semibold text-foreground text-sm md:text-base capitalize'>{withdrawal.walletType || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Status</p>
                                <span className={`px-2 md:px-3 py-1 rounded text-xs font-semibold ${statusColor}`}>
                                  {status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className='grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6 text-xs'>
                              <div>
                                <p className='text-muted-foreground mb-1'>Requested</p>
                                <p className='font-semibold text-foreground'>{withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <div>
                                <p className='text-muted-foreground mb-1'>Wallet Address</p>
                                <p className='font-mono text-foreground truncate'>{withdrawal.walletAddress?.substring(0, 10)}...</p>
                              </div>
                              {withdrawal.paidOutAt && (
                                <div>
                                  <p className='text-muted-foreground mb-1'>Completed</p>
                                  <p className='font-semibold text-foreground'>{new Date(withdrawal.paidOutAt).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>

                            {status === 'pending' && (
                              <div className='flex flex-wrap gap-2'>
                                <button
                                  onClick={() => handleUpdateWithdrawalStatus(withdrawal._id, 'processing', withdrawal.walletType)}
                                  disabled={processingTransactions[withdrawal._id]}
                                  className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                                >
                                  {processingTransactions[withdrawal._id] ? 'Processing...' : 'Mark Processing'}
                                </button>
                                <button
                                  onClick={() => handleUpdateWithdrawalStatus(withdrawal._id, 'completed', withdrawal.walletType)}
                                  disabled={processingTransactions[withdrawal._id]}
                                  className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                                >
                                  {processingTransactions[withdrawal._id] ? 'Processing...' : 'Complete & Debit'}
                                </button>
                              </div>
                            )}
                            {status === 'processing' && (
                              <button
                                onClick={() => handleUpdateWithdrawalStatus(withdrawal._id, 'completed', withdrawal.walletType)}
                                disabled={processingTransactions[withdrawal._id]}
                                className='w-full md:w-auto px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                              >
                                {processingTransactions[withdrawal._id] ? 'Processing...' : 'Mark Complete & Debit'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className='p-8 md:p-12 text-center'>
                    <TrendingUp className='w-12 h-12 md:w-16 md:h-16 text-muted-foreground/30 mx-auto mb-3 md:mb-4' />
                    <p className='text-sm md:text-base text-muted-foreground font-semibold'>No withdrawals found</p>
                    <p className='text-xs md:text-sm text-muted-foreground mt-1'>All withdrawals have been processed</p>
                  </div>
                )}
              </div>
            )}

            {/* USER MANAGEMENT TAB */}
            {activeTab === 'users' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2 mb-3 md:mb-4'>
                    <Users className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    User Management
                  </h2>
                  <div className='flex gap-2 overflow-x-auto pb-1'>
                    <button
                      onClick={() => setUserManagementFilter('all')}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                        userManagementFilter === 'all'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      All Users ({allActiveUsers.length})
                    </button>
                    {['flagged', 'suspended', 'deleted'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setUserManagementFilter(status as any)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                          userManagementFilter === status
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({
                          status === 'flagged' ? flaggedUsers.length : 
                          status === 'suspended' ? suspendedUsers.length : 
                          deletedUsers.length
                        })
                      </button>
                    ))}
                  </div>
                </div>

                {userManagementFilter === 'all' && allActiveUsers.length > 0 ? (
                  <div className='divide-y divide-border'>
                    {allActiveUsers.map((user: any) => (
                      <div 
                        key={user._id} 
                        onClick={() => setSelectedUserForDetails(user._id)}
                        className='p-4 md:p-6 hover:bg-muted/50 transition-colors cursor-pointer'
                      >
                        <div className='flex items-start justify-between mb-3 md:mb-4'>
                          <div className='flex-1'>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{user.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none'>{user.email}</p>
                          </div>
                          <span className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                            user.status === 'active' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                          }`}>
                            {user.status?.toUpperCase()}
                          </span>
                        </div>
                        <div className='grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 text-xs md:text-sm'>
                          <div>
                            <p className='text-muted-foreground mb-1 font-semibold'>Balance</p>
                            <p className='font-bold text-foreground'>${user.currentBalance?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground mb-1 font-semibold'>Invested</p>
                            <p className='font-bold text-primary'>${user.totalInvested?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground mb-1 font-semibold'>Earnings</p>
                            <p className='font-bold text-green-600'>${user.totalEarnings?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground mb-1 font-semibold'>Withdrawn</p>
                            <p className='font-bold text-blue-600'>${user.totalWithdrawn?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground mb-1 font-semibold'>KYC Status</p>
                            <p className={`font-semibold ${user.kycStatus === 'verified' ? 'text-green-600' : user.kycStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                              {(user.kycStatus || 'not_started').toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            onClick={() => handleUserAction(user._id, 'flag', `Manual flag: suspicious activity`)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Flag'}
                          </button>
                          <button
                            onClick={() => handleUserAction(user._id, 'suspend', `Suspended by admin`)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => handleUserAction(user._id, 'delete', `Deleted by admin`)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userManagementFilter === 'flagged' && flaggedUsers.length > 0 ? (
                  <div className='divide-y divide-border'>
                    {flaggedUsers.map((user: any) => (
                      <div key={user._id} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                        <div className='flex items-start justify-between mb-3 md:mb-4'>
                          <div>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{user.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none'>{user.email}</p>
                          </div>
                          <span className='px-2 md:px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-[10px] md:text-xs font-semibold'>
                            Flagged
                          </span>
                        </div>
                        <div className='mb-3 md:mb-4'>
                          <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Flag Reason</p>
                          <p className='text-xs md:text-sm text-foreground'>{user.flagReason || 'No reason provided'}</p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            onClick={() => handleUserAction(user._id, 'suspend', `Suspending flagged user: ${user.flagReason || 'Admin action'}`)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => handleUserAction(user._id, 'delete', user.flagReason || 'Flagged user deletion')}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleRestoreUser(user._id)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Unflag'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userManagementFilter === 'suspended' && suspendedUsers.length > 0 ? (
                  <div className='divide-y divide-border'>
                    {suspendedUsers.map((user: any) => (
                      <div key={user._id} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                        <div className='flex items-start justify-between mb-3 md:mb-4'>
                          <div>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{user.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none'>{user.email}</p>
                          </div>
                          <span className='px-2 md:px-3 py-1 rounded-full bg-orange-500/20 text-orange-600 text-[10px] md:text-xs font-semibold'>
                            Suspended
                          </span>
                        </div>
                        <div className='mb-3 md:mb-4'>
                          <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Reason</p>
                          <p className='text-xs md:text-sm text-foreground'>{user.suspensionReason || 'No reason provided'}</p>
                          <p className='text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2'>Suspended: {new Date(user.suspendedAt).toLocaleDateString()}</p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            onClick={() => handleUserAction(user._id, 'delete', user.suspensionReason || 'Suspended user deletion')}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleRestoreUser(user._id)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userManagementFilter === 'deleted' && deletedUsers.length > 0 ? (
                  <div className='divide-y divide-border'>
                    {deletedUsers.map((user: any) => (
                      <div key={user._id} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                        <div className='flex items-start justify-between mb-3 md:mb-4'>
                          <div>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{user.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none'>{user.email}</p>
                          </div>
                          <span className='px-2 md:px-3 py-1 rounded-full bg-red-500/20 text-red-600 text-[10px] md:text-xs font-semibold'>
                            Deleted
                          </span>
                        </div>
                        <div className='mb-3 md:mb-4'>
                          <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Reason</p>
                          <p className='text-xs md:text-sm text-foreground'>{user.deletionReason || 'No reason provided'}</p>
                          <p className='text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2'>Deleted: {new Date(user.deletedAt).toLocaleDateString()}</p>
                        </div>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => handleRestoreUser(user._id)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 md:flex-none px-3 md:px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? '...' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-4 md:p-6 text-center text-muted-foreground text-sm'>
                    No users in this category
                  </div>
                )}
              </div>
            )}

            {/* PENDING KYC TAB */}
            {activeTab === 'kyc' && (
              <div className='rounded-lg bg-card border border-border'>
                <div className='p-4 md:p-6 border-b border-border'>
                  <h2 className='text-base md:text-xl font-bold text-foreground flex items-center gap-2'>
                    <CheckCircle className='text-primary w-4 h-4 md:w-5 md:h-5' />
                    Pending KYC Verifications ({pendingKYC.length})
                  </h2>
                  <p className='text-xs md:text-sm text-muted-foreground mt-1'>
                    Review and approve user identity documents to enable withdrawals
                  </p>
                </div>
                {pendingKYC.length > 0 ? (
                  <div className='divide-y divide-border'>
                    {pendingKYC.map((user: any) => (
                      <div key={user._id} className='p-4 md:p-6 hover:bg-muted/50 transition-colors'>
                        <div className='flex items-start justify-between mb-3 md:mb-4'>
                          <div>
                            <p className='font-semibold text-foreground text-sm md:text-base'>{user.fullName || 'Unknown'}</p>
                            <p className='text-xs md:text-sm text-muted-foreground truncate max-w-[180px] md:max-w-none'>{user.email}</p>
                          </div>
                          <span className='px-2 md:px-3 py-1 rounded-full bg-orange-500/20 text-orange-600 text-[10px] md:text-xs font-semibold'>
                            Pending Review
                          </span>
                        </div>
                        
                        {/* KYC Details */}
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4'>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Phone</p>
                            <p className='font-semibold text-foreground text-sm'>{user.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Submitted</p>
                            <p className='font-semibold text-foreground text-sm'>{user.kycDocuments?.submittedAt ? new Date(user.kycDocuments.submittedAt).toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Balance</p>
                            <p className='font-semibold text-foreground text-sm'>${user.currentBalance?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div>
                            <p className='text-[10px] md:text-xs text-muted-foreground mb-1'>Joined</p>
                            <p className='font-semibold text-foreground text-sm'>{new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {/* KYC Document Info */}
                        {user.kycDocuments && (
                          <div className='mb-4 p-3 bg-muted/50 rounded-lg'>
                            <p className='text-xs font-semibold text-foreground mb-2'>KYC Documents</p>
                            <div className='grid grid-cols-2 gap-2 text-xs'>
                              <div>
                                <span className='text-muted-foreground'>ID Type:</span>
                                <span className='ml-1 text-foreground'>{user.kycDocuments.idType || 'Not specified'}</span>
                              </div>
                              {user.kycDocuments.idNumber && (
                                <div>
                                  <span className='text-muted-foreground'>ID Number:</span>
                                  <span className='ml-1 text-foreground font-mono'>{user.kycDocuments.idNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className='flex flex-col sm:flex-row gap-2'>
                          <button
                            onClick={() => handleVerifyKYC(user._id, true)}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 px-4 py-2 rounded bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            {processingTransactions[user._id] ? 'Processing...' : 'Approve KYC'}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason (this will be shown to the user):');
                              if (reason) {
                                handleVerifyKYC(user._id, false);
                              }
                            }}
                            disabled={processingTransactions[user._id]}
                            className='flex-1 px-4 py-2 rounded bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white disabled:opacity-50 font-semibold transition-all text-xs md:text-sm'
                          >
                            Reject KYC
                          </button>
                        </div>
                        
                        {/* Info message */}
                        <p className='mt-3 text-[10px] md:text-xs text-muted-foreground'>
                          Approving KYC allows this user to make withdrawals. Rejection will notify the user and allow them to resubmit.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='p-6 md:p-8 text-center'>
                    <CheckCircle className='w-12 h-12 text-green-500/50 mx-auto mb-3' />
                    <p className='text-muted-foreground text-sm font-medium'>No pending KYC verifications</p>
                    <p className='text-xs text-muted-foreground mt-1'>All users with pending KYC have been reviewed</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUserForDetails && (
        <AdminUserDetailsModal 
          userId={selectedUserForDetails}
          onClose={() => setSelectedUserForDetails(null)}
        />
      )}

      {/* Grant PowaUp by Code Modal */}
      {showGrantPowaUpByCode && (
        <GrantPowaUpByCodeModal 
          onClose={() => setShowGrantPowaUpByCode(false)}
        />
      )}

      {/* User Chat Messages Modal */}
      {showChatMessages && (
        <AdminChatMessagesModal 
          onClose={() => setShowChatMessages(false)}
        />
      )}
    </ProtectedRoute>
  );
}
