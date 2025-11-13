/**
 * Authentication API client
 *
 * This module handles all authentication-related API calls to the backend.
 */

import axios from 'axios';
import { AuthUser, LoginData, RegisterData, AuthResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const authClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
authClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Login user with email and password
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await authClient.post<AuthResponse>('/auth/login', data);

  // Store token in localStorage
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
  }

  return response.data;
};

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<void> => {
  const response = await authClient.post('/auth/register', data);

  // After registration, login to get token
  if (response.status === 201) {
    await login({ email: data.email, password: data.password });
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await authClient.get<AuthUser>('/auth/me');
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  // Remove token from localStorage
  localStorage.removeItem('auth_token');
};

/**
 * Initiate Google OAuth login
 */
export const loginWithGoogle = (): void => {
  window.location.href = `${API_URL}/auth/google`;
};
