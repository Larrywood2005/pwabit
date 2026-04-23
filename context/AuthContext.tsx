'use client';

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export interface User {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  avatar?: string; // User avatar URL
  userCode?: string; // 6-digit unique identifier for giveaway system
}

export interface Admin {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isUserAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  userRegister: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<void>;
  userLogin: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    checkAuth();
    // Set up listener for storage changes (for cross-tab sync)
    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAuth = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      const storedAdmin = localStorage.getItem('admin');

      setToken(storedToken);

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setAdmin(null); // Clear admin when user is set
        } catch (e) {
          console.error('[v0] Failed to parse user data');
        }
      }

      if (storedAdmin && !storedUser) {
        try {
          const adminData = JSON.parse(storedAdmin);
          setAdmin(adminData);
          setUser(null); // Clear user when admin is set
        } catch (e) {
          console.error('[v0] Failed to parse admin data');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const userRegister = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      referralCode?: string;
    }) => {
      setIsLoading(true);
      try {
        const response = await apiClient.register(data);
        setToken(response.token);
        setUser(response.user);
        setAdmin(null);

        // Fetch fresh user data to ensure real-time display
        try {
          const freshUserData = await apiClient.getUserData();
          setUser(prev => prev ? { ...prev, ...freshUserData } : freshUserData);
        } catch (err) {
          console.error('[v0] Could not fetch fresh user data:', err);
          // Still proceed with registration, just use the response data
        }
      } catch (error: any) {
        throw new Error(error.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const userLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(email, password);
      setToken(response.token);
      setUser(response.user); // Store complete user data including userCode and avatar
      setAdmin(null);
      
      // Ensure user data with userCode is persisted for immediate display
      if (response.user && response.user.userCode) {
        console.log('[v0] User logged in with userCode:', response.user.userCode);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('[v0] Admin login initiated for:', email);
      const response = await apiClient.adminLogin(email, password);
      console.log('[v0] Admin login response received:', response);
      
      setToken(response.token);
      setAdmin(response.admin);
      setUser(null);

      // Persist admin data and token to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('admin', JSON.stringify(response.admin));
        localStorage.removeItem('user'); // Clear user data when admin logs in
        console.log('[v0] Admin data persisted to localStorage');
      }
    } catch (error: any) {
      console.error('[v0] Admin login error:', error?.message || error);
      throw new Error(error?.message || error instanceof Error ? error.message : 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
      setUser(null);
      setAdmin(null);
      setToken(null);
      // Clear all auth-related localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin');
      }
    } catch (error) {
      console.error('[v0] Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
      setAdmin(null);
      setToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    admin,
    token,
    isLoading,
    isUserAuthenticated: !!user,
    isAdminAuthenticated: !!admin,
    userRegister,
    userLogin,
    adminLogin,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
