import axios, { AxiosError } from 'axios';
import {
  VideoPlayerResponse,
  VideoProgressUpdateRequest,
  PhraseAttemptRequest,
  UserStatsResponse,
  VideoProgress,
} from '@/types/video';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
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

/**
 * Get video player data including video details, phrases, and user progress
 * @param videoId - Video ID
 * @returns VideoPlayerResponse with video, phrases, and progress
 */
export const getVideoPlayer = async (videoId: string): Promise<VideoPlayerResponse> => {
  try {
    const response = await api.get<VideoPlayerResponse>(`/videos/${videoId}/player`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          throw new Error('Video not found');
        }
        throw new Error(
          `Failed to fetch video player data: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to fetch video player data. Please try again.');
  }
};

/**
 * Update video progress (timestamp and completion status)
 * @param videoId - Video ID
 * @param timestamp - Current playback timestamp in seconds
 * @param completed - Whether the video is completed
 * @returns Updated VideoProgress
 */
export const updateVideoProgress = async (
  videoId: string,
  timestamp: number,
  completed: boolean = false
): Promise<VideoProgress> => {
  try {
    const requestData: VideoProgressUpdateRequest = {
      video_id: videoId,
      timestamp,
      completed,
    };

    const response = await api.post<VideoProgress>(
      `/videos/${videoId}/progress`,
      requestData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `Failed to update progress: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to update progress. Please try again.');
  }
};

/**
 * Record a phrase practice attempt
 * @param videoId - Video ID
 * @param phraseIndex - Index of the phrase being practiced
 * @param correct - Whether the attempt was correct
 * @returns Success status
 */
export const recordPhraseAttempt = async (
  videoId: string,
  phraseIndex: number,
  correct: boolean
): Promise<{ success: boolean }> => {
  try {
    const requestData: PhraseAttemptRequest = {
      video_id: videoId,
      phrase_index: phraseIndex,
      correct,
    };

    const response = await api.post<{ success: boolean }>(
      `/videos/${videoId}/attempts`,
      requestData
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `Failed to record attempt: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to record attempt. Please try again.');
  }
};

/**
 * Get user statistics
 * @returns UserStatsResponse with learning statistics
 */
export const getUserStats = async (): Promise<UserStatsResponse> => {
  try {
    const response = await api.get<UserStatsResponse>('/user/stats');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `Failed to fetch user stats: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to fetch user stats. Please try again.');
  }
};

/**
 * Get video progress for a specific video
 * @param videoId - Video ID
 * @returns VideoProgress data
 */
export const getVideoProgress = async (videoId: string): Promise<VideoProgress | null> => {
  try {
    const response = await api.get<VideoProgress>(`/videos/${videoId}/progress`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        // No progress found yet, return null
        return null;
      }
    }
    // For other errors, just return null instead of throwing
    console.warn('Failed to fetch video progress:', error);
    return null;
  }
};
