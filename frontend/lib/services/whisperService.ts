/**
 * Whisper Transcription Service for ShadowSpeak
 *
 * Handles video transcription using OpenAI Whisper API via backend
 */

import { transcribeWithWhisper } from '@/services/videoApi';
import type { TranscriptSentence } from '@/lib/types/transcript';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WhisperTranscriptResponse {
  status: 'success' | 'error';
  transcript: TranscriptSentence[];
  message: string;
  totalSentences: number;
  confidence: number;
  processingTime: number;
  language: string;
  source: 'whisper';
  video_id: string;
}

export interface WhisperProgress {
  stage: 'fetching' | 'transcribing' | 'completed' | 'error';
  message: string;
  percentage: number;
}

export interface WhisperConfig {
  language?: string;
  forceRefresh?: boolean;
  onProgress?: (progress: WhisperProgress) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Build YouTube URL from video ID
 */
export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ============================================================================
// Main Transcription Function
// ============================================================================

/**
 * Transcribe video using Whisper API
 *
 * @param videoId - YouTube video ID or full URL
 * @param config - Configuration options
 * @returns Promise resolving to transcript response
 */
export async function getWhisperTranscript(
  videoId: string,
  config: WhisperConfig = {}
): Promise<WhisperTranscriptResponse> {
  const {
    language, // No default - let Whisper auto-detect language!
    forceRefresh = false,
    onProgress
  } = config;

  // Extract video ID if URL provided (move outside try block for error handling)
  const extractedId = extractVideoId(videoId);
  if (!extractedId) {
    const errorMessage = 'Invalid video ID or URL';

    console.error('[WhisperService] Transcription error:', {
      videoId,
      error: errorMessage
    });

    onProgress?.({
      stage: 'error',
      message: errorMessage,
      percentage: 100
    });

    return {
      status: 'error',
      transcript: [],
      message: errorMessage,
      totalSentences: 0,
      confidence: 0,
      processingTime: 0,
      language,
      source: 'whisper',
      video_id: videoId
    };
  }

  try {
    // Build YouTube URL
    const youtubeUrl = buildYouTubeUrl(extractedId);

    // Notify fetching started
    onProgress?.({
      stage: 'fetching',
      message: 'Sending request to transcription service...',
      percentage: 10
    });

    // Call backend Whisper API
    onProgress?.({
      stage: 'transcribing',
      message: 'Transcribing video with Whisper AI... This may take a moment.',
      percentage: 30
    });

    const response = await transcribeWithWhisper(youtubeUrl, language, forceRefresh);

    // Map backend response to our format
    const transcript: TranscriptSentence[] = response.transcript.map((phrase: any, index: number) => ({
      sentence_id: index + 1,
      text: phrase.text,
      start_time: phrase.start_time,
      end_time: phrase.end_time || (phrase.start_time + (phrase.duration || 0)),
      confidence: 0.95, // Whisper has high confidence
      source: 'whisper'
    }));

    onProgress?.({
      stage: 'completed',
      message: `Successfully transcribed ${transcript.length} phrases`,
      percentage: 100
    });

    return {
      status: 'success',
      transcript,
      message: 'Successfully transcribed with Whisper',
      totalSentences: transcript.length,
      confidence: 0.95,
      processingTime: response.processing_time || 0,
      language: response.language || language,
      source: 'whisper',
      video_id: extractedId
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Failed to transcribe video';

    console.error('[WhisperService] Transcription error:', {
      videoId: extractedId,
      error: errorMessage,
      errorType: error.constructor.name,
      stack: error.stack
    });

    onProgress?.({
      stage: 'error',
      message: errorMessage,
      percentage: 100
    });

    return {
      status: 'error',
      transcript: [],
      message: errorMessage,
      totalSentences: 0,
      confidence: 0,
      processingTime: 0,
      language,
      source: 'whisper',
      video_id: extractedId
    };
  }
}

/**
 * Check if video ID is valid
 */
export function isValidVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}
