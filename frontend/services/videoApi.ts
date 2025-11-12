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
 * Transcribe video using Whisper API
 * @param youtubeUrl - Full YouTube URL
 * @param language - Language code (optional)
 * @param forceRefresh - Force re-transcription (optional)
 * @returns Whisper transcript response
 */
export const transcribeWithWhisper = async (
  youtubeUrl: string,
  language?: string,
  forceRefresh?: boolean
): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    const response = await api.post(
      '/videos/transcripts/whisper',
      {
        youtube_url: youtubeUrl,
        language: language || 'en',
        force_refresh: forceRefresh || false
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 120000 // 2 minutes for Whisper transcription
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const detail = (axiosError.response.data as any)?.detail || axiosError.message;

        if (status === 401) {
          throw new Error('You must be logged in to transcribe videos');
        } else if (status === 400) {
          throw new Error(detail || 'Invalid YouTube URL');
        } else if (status === 429) {
          throw new Error('API quota exceeded. Please try again later.');
        } else if (status === 503) {
          throw new Error('Transcription service unavailable. Please try again later.');
        }
        throw new Error(`Failed to transcribe: ${detail}`);
      } else if (axiosError.request) {
        throw new Error('No response from server. Please check your connection.');
      }
    }
    throw new Error('Failed to transcribe video. Please try again.');
  }
};
