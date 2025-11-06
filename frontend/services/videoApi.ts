import axios, { AxiosError } from 'axios';
import { VideoResponse, VideoSearchResponse, TranscriptResponse } from '@/types/video';

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
 * Search for videos
 * @param query - Search query string
 * @param language - Optional language filter
 * @returns VideoSearchResponse with videos and metadata
 */
export const searchVideos = async (
  query: string,
  language?: string
): Promise<VideoSearchResponse> => {
  try {
    const params: any = { q: query };
    if (language) {
      params.language = language;
    }

    const response = await api.get<VideoSearchResponse>('/videos/search', { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `Failed to search videos: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to search videos. Please try again.');
  }
};

/**
 * Get video details by ID
 * @param videoId - Video ID
 * @returns VideoResponse with video details
 */
export const getVideoDetails = async (videoId: string): Promise<VideoResponse> => {
  try {
    const response = await api.get<VideoResponse>(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          throw new Error('Video not found');
        }
        throw new Error(
          `Failed to fetch video details: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to fetch video details. Please try again.');
  }
};

/**
 * Get video transcript/phrases
 * @param videoId - Video ID
 * @returns TranscriptResponse with phrases
 */
export const getTranscript = async (videoId: string): Promise<TranscriptResponse> => {
  try {
    const response = await api.get<TranscriptResponse>(`/videos/${videoId}/transcript`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        if (axiosError.response.status === 404) {
          throw new Error('Transcript not found for this video');
        }
        throw new Error(
          `Failed to fetch transcript: ${axiosError.response.status} - ${
            (axiosError.response.data as any)?.message || axiosError.message
          }`
        );
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to fetch transcript. Please try again.');
  }
};
