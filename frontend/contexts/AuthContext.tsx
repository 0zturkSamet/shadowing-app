'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginData, RegisterData } from '@/types';
import * as authApi from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          // Token is invalid or expired, clear it
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Auto-logout after 24 hours
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        logout();
      }, 24 * 60 * 60 * 1000); // 24 hours

      return () => clearTimeout(timer);
    }
  }, [user]);

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      await authApi.login(data);
      const storedToken = localStorage.getItem('auth_token');
      setToken(storedToken);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      router.push('/');
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Invalid email or password';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      await authApi.register(data);
      const storedToken = localStorage.getItem('auth_token');
      setToken(storedToken);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      router.push('/');
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authApi.logout();
      setToken(null);
      setUser(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
