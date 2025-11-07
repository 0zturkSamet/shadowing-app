import axios, { AxiosInstance, AxiosError } from 'axios';
import { Video, UserProgress, Phrase, SearchParams, AuthUser, AuthResponse, LoginData, RegisterData } from '@/types';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/auth/login';
          break;
        case 403:
          console.error('Forbidden: You do not have permission to access this resource');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Internal server error');
          break;
        default:
          console.error('An error occurred:', error.response.data);
      }
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// API helper functions

/**
 * Search for videos
 */
export const searchVideos = async (params: SearchParams): Promise<Video[]> => {
  try {
    const response = await api.get('/videos/search', { params });
    return response.data;
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

/**
 * Get video transcript/phrases
 */
export const getTranscript = async (videoId: string): Promise<Phrase[]> => {
  try {
    const response = await api.get(`/videos/${videoId}/transcript`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<UserProgress> => {
  try {
    const response = await api.get('/user/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Get user progress
 */
export const getProgress = async (): Promise<UserProgress> => {
  try {
    const response = await api.get('/user/progress');
    return response.data;
  } catch (error) {
    console.error('Error fetching progress:', error);
    throw error;
  }
};

/**
 * Get trending videos
 */
export const getTrendingVideos = async (limit: number = 10): Promise<Video[]> => {
  try {
    const response = await api.get('/videos/trending', { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    throw error;
  }
};

/**
 * Get video by ID
 */
export const getVideoById = async (videoId: string): Promise<Video> => {
  try {
    const response = await api.get(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching video:', error);
    throw error;
  }
};

// Auth API functions

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/register', data);
    const authResponse: AuthResponse = response.data;
    // Store token in localStorage
    if (authResponse.access_token) {
      localStorage.setItem('auth_token', authResponse.access_token);
    }
    return authResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw { error: 'Network error', message: 'Failed to connect to server' };
  }
};

/**
 * Login user
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await api.post('/auth/login', data);

    const authResponse: AuthResponse = response.data;
    // Store token in localStorage
    if (authResponse.access_token) {
      localStorage.setItem('auth_token', authResponse.access_token);
    }
    return authResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw { error: 'Network error', message: 'Failed to connect to server' };
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Error during logout:', error);
  } finally {
    // Always clear token from localStorage
    localStorage.removeItem('auth_token');
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthUser> => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

export default api;
