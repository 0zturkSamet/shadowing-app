'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginData, RegisterData } from '@/types';
import * as authApi from '@/services/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AuthUser | null;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check for existing token and fetch user on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          // Token is invalid or expired, clear it
          localStorage.removeItem('auth_token');
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
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
