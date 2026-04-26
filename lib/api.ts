import axios, { AxiosError, AxiosInstance } from 'axios';

// Determine the correct API base URL
const getApiBaseUrl = () => {
  // In production (Vercel), use the environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fallback: detect the backend URL from the current domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If on powabitz.com or www.powabitz.com, use the render backend
    if (hostname.includes('powabitz.com')) {
      return 'https://pwabit.onrender.com/api';
    }
  }
  
  // Development fallback
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000
    });

// Request interceptor to attach token
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        } else if (error.response?.status === 403) {
          // Unauthorized - insufficient permissions
          console.error('[v0] Unauthorized (403) - check token or user role');
          const errorData = error.response?.data as any;
          if (errorData?.message) {
            console.error('[v0] Authorization error:', errorData.message);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
    }
  }

  // Auth endpoints
  async register(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    referralCode?: string;
  }) {
    try {
      const response = await this.client.post('/auth/register', data);
      if (response.data.token) {
        this.setToken(response.data.token);
        const userData = response.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('admin'); // Clear admin data when user registers
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      if (response.data.token) {
        this.setToken(response.data.token);
        const userData = response.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('admin'); // Clear admin data when user logs in
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async adminLogin(email: string, password: string) {
    try {
      const response = await this.client.post('/admin/login', { email, password });
      
      if (response.data.token) {
        this.setToken(response.data.token);
        const adminData = response.data.admin;
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('admin', JSON.stringify(adminData));
        localStorage.removeItem('user'); // Clear user data when admin logs in
      }
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to notify backend
      await this.client.post('/auth/logout', {});
    } catch (error) {
      // Don't throw error - still logout on client side even if backend call fails
      console.error('[v0] Logout endpoint error:', error);
    } finally {
      // Always remove token and clear client state
      this.removeToken();
    }
  }

  async forgotPassword(email: string) {
    try {
      const response = await this.client.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const response = await this.client.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Admin endpoints
  async getAdminUsers(page: number = 1, limit: number = 20, status?: string) {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.append('status', status);
      const response = await this.client.get(`/admin/users?${params}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAdminUserDetails(userId: string) {
    try {
      const response = await this.client.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async grantPowaUpToUser(userId: string, amount: number) {
    try {
      const response = await this.client.post(`/admin/grant-powaup/${userId}`, { amount });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async grantPowaUpByUserCode(userCode: string, amount: number) {
    try {
      const response = await this.client.post(`/admin/grant-powaup-by-code/${userCode}`, { amount });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async grantUSD(userCode: string, amount: number) {
    try {
      const response = await this.client.post(`/admin/grant-usd`, { userCode, amount });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Notification endpoints
  async getNotifications(page: number = 1, limit: number = 50) {
    try {
      const response = await this.client.get(`/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const response = await this.client.post(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markAllNotificationsAsRead() {
    try {
      const response = await this.client.post(`/notifications/read-all`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const response = await this.client.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUnreadNotificationCount() {
    try {
      const response = await this.client.get(`/notifications/unread-count`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async findUserByCode(userCode: string) {
    try {
      const response = await this.client.get(`/admin/find-user-by-code/${userCode}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAdminStats() {
    try {
      const response = await this.client.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAdminActivities(page: number = 1, limit: number = 20) {
    try {
      const response = await this.client.get(`/admin/activities?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async approveInvestment(investmentId: string) {
    try {
      const response = await this.client.post(`/admin/investments/${investmentId}/approve`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async rejectInvestment(investmentId: string, reason: string) {
    try {
      const response = await this.client.post(`/admin/investments/${investmentId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User endpoints
  async getUserData() {
    try {
      const response = await this.client.get('/auth/me');
      if (response.data) {
        // Update localStorage with fresh data
        const userData = {
          id: response.data._id || response.data.id,
          fullName: response.data.fullName,
          email: response.data.email,
          userCode: response.data.userCode, // Include 6-digit code
          avatar: response.data.avatar, // Include avatar URL
          isEmailVerified: response.data.isEmailVerified,
          kycStatus: response.data.kycStatus,
          status: response.data.status
        };
        localStorage.setItem('user', JSON.stringify(userData));
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentAdmin() {
    try {
      const response = await this.client.get('/admin/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserWallet() {
    try {
      const response = await this.client.get('/wallets/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserInvestments(page: number = 1, limit: number = 10) {
    try {
      const response = await this.client.get(`/investments?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createInvestment(data: {
    packageId: string;
    amount: number;
  }) {
    try {
      const response = await this.client.post('/investments', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async placeTrade(investmentId: string) {
    try {
      const response = await this.client.post(`/investments/${investmentId}/trade`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async completeTrade(investmentId: string) {
    try {
      const response = await this.client.post(`/investments/${investmentId}/trade/complete`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async withdrawInvestment(investmentId: string) {
    try {
      const response = await this.client.post(`/investments/${investmentId}/withdraw`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvestmentDetails(investmentId: string) {
    try {
      const response = await this.client.get(`/investments/${investmentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWalletBalances() {
    try {
      const response = await this.client.get('/wallets/balances');
      return response.data;
    } catch (error) {
      console.error('[v0] Wallet balances fetch error:', error);
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  async getWalletTransactions(page: number = 1, limit: number = 10) {
    try {
      const response = await this.client.get(`/wallets/transactions?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('[v0] Wallet transactions fetch error:', error);
      // Return object with empty data array instead of throwing
      return { data: [], pagination: { page, limit, total: 0 } };
    }
  }

  async getUserActivities(page: number = 1, limit: number = 10) {
    try {
      const response = await this.client.get(`/activities?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPendingDeposits() {
    try {
      const response = await this.client.get('/admin/deposits/pending');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all deposits including confirmed/rejected for audit trail
  async getAllDepositsHistory() {
    try {
      const response = await this.client.get('/admin/deposits/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async confirmDeposit(transactionId: string) {
    try {
      const response = await this.client.post(`/admin/confirm-deposit/${transactionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPendingKYC() {
    try {
      // Backend route is at /kyc/admin/pending (not /admin/kyc/pending)
      const response = await this.client.get('/kyc/admin/pending');
      return response.data.data || [];
    } catch (error) {
      console.error('[v0] Failed to fetch pending KYC:', error);
      throw this.handleError(error);
    }
  }

  // Get all KYC submissions including verified/rejected for audit trail
  async getAllKYCHistory() {
    try {
      // Similar to getPendingKYC, need to fetch all from the KYC service
      const response = await this.client.get('/kyc/admin/pending');
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyKYC(kycId: string, approved: boolean, notes: string = '') {
    try {
      // Use the correct backend endpoint - /kyc/admin/approve or /kyc/admin/reject
      if (approved) {
        const response = await this.client.put(`/kyc/admin/approve/${kycId}`);
        return response.data;
      } else {
        const response = await this.client.put(`/kyc/admin/reject/${kycId}`, { rejectionReason: notes });
        return response.data;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // KYC endpoints
  async submitKYC(data: {
    fullName: string;
    dateOfBirth: string;
    identityPhoto: string;
  }) {
    try {
      const response = await this.client.post('/kyc/submit', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getKYCStatus() {
    try {
      const response = await this.client.get('/kyc/status');
      return response.data;
    } catch (error) {
      return { status: 'not-submitted', kyc: null, canUpdate: true };
    }
  }

  async updateKYC(data: {
    fullName: string;
    dateOfBirth: string;
    identityPhoto: string;
  }) {
    try {
      const response = await this.client.put('/kyc/update', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAdminPendingKYC() {
    try {
      const response = await this.client.get('/kyc/admin/pending');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async approveKYC(kycId: string) {
    try {
      const response = await this.client.put(`/kyc/admin/approve/${kycId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async rejectKYC(kycId: string, rejectionReason: string) {
    try {
      const response = await this.client.put(`/kyc/admin/reject/${kycId}`, { rejectionReason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Game Reward endpoints
  async claimDailyLoginReward() {
    try {
      const response = await this.client.post('/games/claim-daily-login');
      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      console.error('[v0] Daily login reward error response:', errorData);
      const apiError = this.handleError(error);
      throw new Error(errorData?.message || apiError.message || 'Failed to claim daily bonus');
    }
  }

  async claimPuzzleWinReward() {
    try {
      const response = await this.client.post('/games/claim-puzzle-win');
      return response.data;
    } catch (error: any) {
      const errorData = error?.response?.data;
      console.error('[v0] Puzzle win reward error response:', errorData);
      const apiError = this.handleError(error);
      throw new Error(errorData?.message || apiError.message || 'Failed to claim puzzle reward');
    }
  }

  async getMyRewards() {
    try {
      const response = await this.client.get('/games/my-rewards');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async checkGameClaimEligibility(type: string) {
    try {
      const response = await this.client.get(`/games/check-claim/${type}`);
      return response.data;
    } catch (error) {
      return { canClaim: true, alreadyClaimed: false };
    }
  }

  async getAdminGameRewards() {
    try {
      const response = await this.client.get('/games/admin/all-rewards');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }



  // User Profile endpoints
  async getUserProfile() {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get financial summary with all balance fields for dashboard display
  async getFinancialSummary() {
    try {
      const response = await this.client.get('/auth/financial-summary');
      return response.data;
    } catch (error) {
      console.error('[v0] Financial summary error:', error);
      throw this.handleError(error);
    }
  }

  async updateAvatar(avatarUrl: string) {
    try {
      const response = await this.client.put('/auth/update-avatar', { avatar: avatarUrl });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Withdrawal endpoints
  async requestWithdrawal(data: {
    amount: number;
    walletId: string;
    currency?: string;
    method?: string;
    skipOTPVerification?: boolean;
  }) {
    try {
      // Use the correct endpoint: /wallets/withdrawal (not /wallets/withdraw)
      const response = await this.client.post('/wallets/withdrawal', {
        ...data,
        currency: data.currency || 'USD',
        method: data.method || 'crypto',
        skipOTPVerification: data.skipOTPVerification !== false // Default to true
      });
      return response.data;
    } catch (error) {
      const apiError = this.handleError(error);
      throw new Error(apiError.message);
    }
  }

  // Admin Withdrawal Management endpoints
  async getPendingWithdrawals() {
    try {
      const response = await this.client.get('/admin/withdrawals/pending');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all withdrawals including history for audit trail
  async getAllWithdrawalHistory() {
    try {
      const response = await this.client.get('/admin/withdrawals/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPendingPaymentReceipts() {
    try {
      const response = await this.client.get('/admin/payment-receipts');
      return response.data;
    } catch (error) {
      console.error('[v0] Payment receipts fetch error:', error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0 } };
    }
  }

  async getAllWithdrawals(status: string = 'all', limit: number = 50, page: number = 1) {
    try {
      const response = await this.client.get(`/admin/withdrawals?status=${status}&limit=${limit}&page=${page}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateWithdrawalStatus(transactionId: string, data: {
    newStatus: 'pending' | 'processing' | 'completed';
    paymentMethod?: string;
    paymentNotes?: string;
  }) {
    try {
      // Use PUT method to match the backend route
      const response = await this.client.put(`/admin/withdrawals/${transactionId}/status`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Admin User Management endpoints
  async flagUser(userId: string, reason: string) {
    try {
      const response = await this.client.post(`/admin/users/${userId}/flag`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async suspendUser(userId: string, reason: string) {
    try {
      const response = await this.client.post(`/admin/users/${userId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(userId: string, reason: string) {
    try {
      const response = await this.client.post(`/admin/users/${userId}/delete`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async restoreUser(userId: string, reason?: string) {
    try {
      const response = await this.client.post(`/admin/users/${userId}/restore`, { reason });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUsersByStatus(status: string, limit: number = 50, page: number = 1) {
    try {
      const response = await this.client.get(`/admin/users/status/${status}?limit=${limit}&page=${page}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PowaUp Trading Credits endpoints
  async getPowaUpBalance() {
    try {
      const response = await this.client.get('/powaup/balance');
      return response.data;
    } catch (error: any) {
      // Return default balance of 30 if API fails (new users get 30 free)
      // This prevents "insufficient PowaUp" errors when backend is unavailable
      return { powaUpBalance: 30, powaUpSpent: 0, totalPowaUpPurchased: 0 };
    }
  }

  async getBalanceInfo() {
    try {
      const response = await this.client.get('/investments/balance/info');
      return response.data;
    } catch (error) {
      console.error('[v0] Error fetching balance info:', error);
      // Return default balance on error
      return {
        totalBalance: 0,
        availableBalance: 0,
        lockedInTrades: 0
      };
    }
  }

  async getPowaUpHistory() {
    try {
      const response = await this.client.get('/powaup/history');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async purchasePowaUp(amount: number) {
    try {
      const response = await this.client.post('/powaup/purchase', { amount });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async usePowaUp(amount: number, tradeId?: string) {
    try {
      const response = await this.client.post('/powaup/use', { amount, tradeId });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPowaUpPricing() {
    try {
      const response = await this.client.get('/powaup/pricing');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Wallet Address endpoints
  async getWalletAddresses(type?: string) {
    try {
      const url = type ? `/wallet-addresses?type=${type}` : '/wallet-addresses';
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addWalletAddress(data: any) {
    try {
      const response = await this.client.post('/wallet-addresses', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async setDefaultWallet(walletId: string) {
    try {
      const response = await this.client.put(`/wallet-addresses/set-default/${walletId}`, {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteWalletAddress(walletId: string) {
    try {
      const response = await this.client.delete(`/wallet-addresses/delete/${walletId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDefaultWallet() {
    try {
      const response = await this.client.get('/wallet-addresses/default');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Admin: Get all user wallet addresses
  async getAdminAllWalletAddresses() {
    try {
      const response = await this.client.get('/wallet-addresses/admin/all-wallets');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Referral endpoints
  async getReferralStats() {
    try {
      const response = await this.client.get('/auth/referral-stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async validateReferralCode(code: string) {
    try {
      const response = await this.client.get(`/auth/validate-referral/${code}`);
      return response.data;
    } catch (error) {
      return { valid: false, message: 'Error validating code' };
    }
  }

  // Giveaway endpoints
  async requestWithdrawalOTP() {
    try {
      const response = await this.client.post('/auth/request-withdrawal-otp', {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendGiveaway(userCode: string, amount: number, type: 'usd' | 'powaup', otp?: string) {
    try {
      const payload: any = { userCode, amount, type };
      if (otp) payload.otp = otp;
      const response = await this.client.post('/giveaway/send', payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getGiveawayHistory(typeFilter: 'all' | 'sent' | 'received' = 'all', limit: number = 20, page: number = 0) {
    try {
      const response = await this.client.get(`/giveaway/history?type=${typeFilter}&limit=${limit}&page=${page}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async validateRecipient(userCode: string) {
    try {
      const response = await this.client.get(`/giveaway/validate-recipient/${userCode}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generic HTTP methods
  async get(url: string, config?: any) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post(url: string, data?: any, config?: any) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put(url: string, data?: any, config?: any) {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete(url: string, config?: any) {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      let message = error.response?.data?.message || error.message || 'An error occurred';
      
      // Log detailed error info for debugging
      console.error(`[v0] API Error (${status}):`, {
        message,
        url: error.config?.url,
        method: error.config?.method,
        hasToken: !!this.getToken(),
      });

      // Handle specific status codes
      if (status === 404) {
        message = `API endpoint not found: ${error.config?.url}`;
      } else if (status === 403) {
        message = 'Unauthorized: Insufficient permissions or invalid token';
      } else if (status === 401) {
        message = 'Authentication failed: Please login again';
      } else if (status === 500) {
        message = 'Server error: Please try again later';
      }

      return {
        message,
        status,
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
    };
  }
}

export const apiClient = new ApiClient();
