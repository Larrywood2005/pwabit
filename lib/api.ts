import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pwabit.onrender.com/';

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
    });

    // Add request interceptor to attach token
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
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('[v0] Token found:', token.substring(0, 10) + '...');
      }
      return token;
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
      console.log('[v0] API: Sending admin login request to /admin/login');
      const response = await this.client.post('/admin/login', { email, password });
      console.log('[v0] API: Admin login response received:', response.data);
      
      if (response.data.token) {
        this.setToken(response.data.token);
        const adminData = response.data.admin;
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('admin', JSON.stringify(adminData));
        localStorage.removeItem('user'); // Clear user data when admin logs in
        console.log('[v0] API: Admin token and data persisted');
      }
      return response.data;
    } catch (error: any) {
      console.error('[v0] API: Admin login failed:', error?.response?.data || error?.message || error);
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
      const response = await this.client.get('/admin/kyc/pending');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyKYC(userId: string, approved: boolean, notes: string = '') {
    try {
      const response = await this.client.post(`/admin/verify-kyc/${userId}`, { approved, notes });
      return response.data;
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
      return { status: 'not-submitted', kyc: null };
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

  // Wallet Address endpoints
  async addWalletAddress(data: {
    walletAddress: string;
    walletType: string;
  }) {
    try {
      const response = await this.client.post('/wallet-addresses/add', data);
      return response.data;
    } catch (error) {
      const apiError = this.handleError(error);
      throw new Error(apiError.message);
    }
  }

  async getUserWallets() {
    try {
      const response = await this.client.get('/wallet-addresses/my-wallets');
      return response.data;
    } catch (error) {
      return { wallets: [] };
    }
  }

  async getDefaultWallet() {
    try {
      const response = await this.client.get('/wallet-addresses/default');
      return response.data;
    } catch (error) {
      return { wallet: null };
    }
  }

  async setDefaultWallet(walletId: string) {
    try {
      const response = await this.client.put(`/wallet-addresses/set-default/${walletId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteWallet(walletId: string) {
    try {
      const response = await this.client.delete(`/wallet-addresses/delete/${walletId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAdminWalletAddresses() {
    try {
      const response = await this.client.get('/wallet-addresses/admin/all-wallets');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllBankAccounts() {
    try {
      const response = await this.client.get('/wallet-addresses');
      // Filter for bank accounts and return array
      if (response.data && Array.isArray(response.data)) {
        return response.data.filter((acc: any) => acc.type === 'bank_account');
      }
      return [];
    } catch (error) {
      console.error('[v0] Error fetching bank accounts:', error);
      return [];
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

  // Withdrawal endpoints
  async requestWithdrawal(data: {
    amount: number;
    walletId: string;
  }) {
    try {
      const response = await this.client.post('/wallets/withdraw', data);
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
      const response = await this.client.post(`/admin/withdrawals/${transactionId}/status`, data);
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
    } catch (error) {
      throw this.handleError(error);
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
