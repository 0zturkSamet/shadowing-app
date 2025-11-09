/**
 * Transcript Orchestrator Service for ShadowSpeak
 *
 * Coordinates multiple transcript sources with intelligent fallback:
 * 1. YouTube captions (fast, accurate, free)
 * 2. Web Speech API (slower, real-time, fallback)
 *
 * Features:
 * - Automatic source selection
 * - IndexedDB caching for zero-latency on repeat requests
 * - Progress tracking and user feedback
 * - Retry logic with exponential backoff
 * - Unified error handling
 */

import { extractYouTubeTranscript } from './youtubeTranscript';
import {
  transcribeVideoWithWebSpeech,
  isWebSpeechSupported,
  WebSpeechError,
  type TranscriptionProgress
} from './webSpeechTranscript';
import {
  getCachedTranscript,
  setCachedTranscript,
  type CacheStats
} from './transcriptCache';
import type { TranscriptSentence } from '@/lib/types/transcript';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Transcript source type
 */
export type TranscriptSource = 'youtube' | 'web_speech' | 'none';

/**
 * Status of transcript extraction
 */
export type TranscriptStatus = 'success' | 'partial' | 'error';

/**
 * Unified transcript response
 */
export interface TranscriptResponse {
  status: TranscriptStatus;
  source: TranscriptSource;
  transcript: TranscriptSentence[];
  message: string;
  totalSentences: number;
  confidence: number;
  processingTime: number; // milliseconds
  language: string;
  cached?: boolean;
  cacheAge?: number; // milliseconds
}

/**
 * Progress callback for transcript extraction
 */
export interface OrchestratorProgress {
  stage: 'cache_check' | 'youtube_fetch' | 'web_speech_extract' | 'processing' | 'completed' | 'error';
  source: TranscriptSource;
  message: string;
  percentage: number;
  currentAttempt?: number;
  maxAttempts?: number;
}

/**
 * Configuration options
 */
export interface OrchestratorConfig {
  language?: string;
  forceRefresh?: boolean; // Skip cache
  preferredSource?: TranscriptSource; // Force specific source
  maxRetries?: number;
  onProgress?: (progress: OrchestratorProgress) => void;
  videoElement?: HTMLVideoElement; // Required for Web Speech
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [500, 1000, 2000]; // Exponential backoff
const YOUTUBE_PRIORITY = 1; // YouTube is tried first
const WEB_SPEECH_PRIORITY = 2; // Web Speech is fallback

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Delay execution for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate average confidence from transcript
 */
function calculateAverageConfidence(transcript: TranscriptSentence[]): number {
  if (transcript.length === 0) return 0;
  const sum = transcript.reduce((acc, sentence) => acc + (sentence.confidence || 0), 0);
  return parseFloat((sum / transcript.length).toFixed(2));
}

/**
 * Convert language code to Web Speech format
 * en -> en-US, es -> es-ES, etc.
 */
function convertToWebSpeechLanguage(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'tr': 'tr-TR'
  };

  return languageMap[languageCode] || languageCode;
}

/**
 * Get user-friendly error message based on error code
 */
function getUserFriendlyMessage(error: any, source: TranscriptSource): string {
  const errorMessage = error?.message || String(error);
  const errorCode = error?.code;

  // YouTube-specific errors
  if (source === 'youtube') {
    if (errorCode === 'VIDEO_NOT_FOUND') {
      return 'Video not found. Please check the video ID and try again.';
    }
    if (errorCode === 'NO_CAPTIONS') {
      return 'No captions available for this video. Attempting live transcription...';
    }
    if (errorCode === 'NETWORK_ERROR') {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (errorCode === 'INVALID_VIDEO_ID') {
      return 'Invalid video ID format. Please provide a valid YouTube video ID.';
    }
  }

  // Web Speech-specific errors
  if (source === 'web_speech') {
    if (error instanceof WebSpeechError) {
      switch (error.code) {
        case 'NOT_SUPPORTED':
          return 'Web Speech API is not supported in your browser. Please use Chrome, Edge, or Safari.';
        case 'PERMISSION_DENIED':
          return 'Microphone permission denied. Please enable microphone access to use live transcription.';
        case 'AUDIO_FAILED':
          return 'Failed to extract audio from video. Please try again.';
        case 'NO_SPEECH':
          return 'No speech detected in the video. Please ensure the video has clear audio.';
        case 'NETWORK_ERROR':
          return 'Network error during transcription. Please check your connection.';
        case 'TRANSCRIPTION_FAILED':
          return 'Transcription failed. Please try again.';
      }
    }
  }

  // Generic error
  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// Main Orchestrator Function
// ============================================================================

/**
 * Get transcript with intelligent source selection and caching
 *
 * Flow:
 * 1. Check cache (if not forceRefresh)
 * 2. Try YouTube captions (fast, accurate)
 * 3. Fallback to Web Speech API (slower, real-time)
 * 4. Return unified response with error handling
 *
 * @param videoId - YouTube video ID
 * @param config - Configuration options
 * @returns Promise resolving to unified transcript response
 *
 * @example
 * ```typescript
 * const result = await getTranscript('dQw4w9WgXcQ', {
 *   language: 'en',
 *   onProgress: (progress) => console.log(progress.message)
 * });
 *
 * if (result.status === 'success') {
 *   console.log(`Got ${result.totalSentences} sentences from ${result.source}`);
 * }
 * ```
 */
export async function getTranscript(
  videoId: string,
  config: OrchestratorConfig = {}
): Promise<TranscriptResponse> {
  const startTime = Date.now();
  const {
    language = DEFAULT_LANGUAGE,
    forceRefresh = false,
    preferredSource,
    maxRetries = DEFAULT_MAX_RETRIES,
    onProgress,
    videoElement
  } = config;

  console.log(`[Orchestrator] Starting transcript extraction for video: ${videoId}`);
  console.log(`[Orchestrator] Config:`, { language, forceRefresh, preferredSource, maxRetries });

  // ============================================================================
  // Step 1: Check Cache
  // ============================================================================

  if (!forceRefresh) {
    onProgress?.({
      stage: 'cache_check',
      source: 'none',
      message: 'Checking cache...',
      percentage: 0
    });

    const cached = await getCachedTranscript(videoId, language);

    if (cached) {
      const processingTime = Date.now() - startTime;

      console.log(`[Orchestrator] ✓ Cache hit! Age: ${(cached.stats.age! / 1000 / 60).toFixed(1)} minutes`);

      onProgress?.({
        stage: 'completed',
        source: cached.data.source,
        message: 'Loaded from cache (instant!)',
        percentage: 100
      });

      return {
        ...cached.data,
        cached: true,
        cacheAge: cached.stats.age,
        processingTime
      };
    }

    console.log(`[Orchestrator] Cache miss - fetching fresh transcript`);
  }

  // ============================================================================
  // Step 2: Try YouTube Captions (Priority 1)
  // ============================================================================

  if (preferredSource !== 'web_speech') {
    console.log(`[Orchestrator] Attempting YouTube captions...`);

    onProgress?.({
      stage: 'youtube_fetch',
      source: 'youtube',
      message: 'Fetching YouTube captions...',
      percentage: 10
    });

    try {
      const youtubeResult = await extractYouTubeTranscript(videoId, language);

      if (youtubeResult.status === 'success') {
        const processingTime = Date.now() - startTime;

        console.log(`[Orchestrator] ✓ YouTube success! ${youtubeResult.totalSentences} sentences in ${processingTime}ms`);

        const response: TranscriptResponse = {
          status: 'success',
          source: 'youtube',
          transcript: youtubeResult.transcript,
          message: 'Successfully extracted YouTube captions',
          totalSentences: youtubeResult.totalSentences,
          confidence: calculateAverageConfidence(youtubeResult.transcript),
          processingTime,
          language: youtubeResult.language,
          cached: false
        };

        // Cache the successful result
        setCachedTranscript(videoId, language, response).catch(err =>
          console.error('[Orchestrator] Failed to cache transcript:', err)
        );

        onProgress?.({
          stage: 'completed',
          source: 'youtube',
          message: `Successfully extracted ${response.totalSentences} sentences`,
          percentage: 100
        });

        return response;
      }

      // YouTube failed - log and continue to fallback
      console.log(`[Orchestrator] ✗ YouTube failed:`, youtubeResult);

      const errorMessage = getUserFriendlyMessage(youtubeResult, 'youtube');

      onProgress?.({
        stage: 'youtube_fetch',
        source: 'youtube',
        message: errorMessage,
        percentage: 30
      });

      // If video not found or invalid, don't try Web Speech
      if ('code' in youtubeResult &&
          (youtubeResult.code === 'VIDEO_NOT_FOUND' || youtubeResult.code === 'INVALID_VIDEO_ID')) {
        return {
          status: 'error',
          source: 'none',
          transcript: [],
          message: errorMessage,
          totalSentences: 0,
          confidence: 0,
          processingTime: Date.now() - startTime,
          language,
          cached: false
        };
      }

      // Continue to Web Speech fallback for NO_CAPTIONS
      console.log(`[Orchestrator] Falling back to Web Speech API...`);

    } catch (error) {
      console.error(`[Orchestrator] YouTube error:`, error);
      // Continue to Web Speech fallback
    }
  }

  // ============================================================================
  // Step 3: Fallback to Web Speech API (Priority 2)
  // ============================================================================

  if (preferredSource !== 'youtube') {
    console.log(`[Orchestrator] Attempting Web Speech API transcription...`);

    // Check if Web Speech is supported
    if (!isWebSpeechSupported()) {
      console.error(`[Orchestrator] ✗ Web Speech not supported`);

      return {
        status: 'error',
        source: 'none',
        transcript: [],
        message: 'Could not extract transcript. Web Speech API is not supported in your browser. Please use Chrome, Edge, or Safari.',
        totalSentences: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
        language,
        cached: false
      };
    }

    // Check if video element is provided
    if (!videoElement) {
      console.error(`[Orchestrator] ✗ Video element not provided for Web Speech`);

      return {
        status: 'error',
        source: 'none',
        transcript: [],
        message: 'Video element is required for live transcription. Please try again.',
        totalSentences: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
        language,
        cached: false
      };
    }

    onProgress?.({
      stage: 'web_speech_extract',
      source: 'web_speech',
      message: 'Loading transcript... (using live transcription)',
      percentage: 40
    });

    try {
      const webSpeechLanguage = convertToWebSpeechLanguage(language);

      console.log(`[Orchestrator] Starting Web Speech with language: ${webSpeechLanguage}`);

      const transcript = await transcribeVideoWithWebSpeech(
        videoElement,
        { language: webSpeechLanguage },
        (progress: TranscriptionProgress) => {
          // Map Web Speech progress to orchestrator progress
          const percentage = 40 + (progress.percentage || 0) * 0.6; // 40-100%

          onProgress?.({
            stage: 'web_speech_extract',
            source: 'web_speech',
            message: progress.message,
            percentage
          });
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(`[Orchestrator] ✓ Web Speech success! ${transcript.length} sentences in ${processingTime}ms`);

      const response: TranscriptResponse = {
        status: 'success',
        source: 'web_speech',
        transcript,
        message: 'Successfully transcribed audio using Web Speech API',
        totalSentences: transcript.length,
        confidence: calculateAverageConfidence(transcript),
        processingTime,
        language: webSpeechLanguage,
        cached: false
      };

      // Cache the successful result
      setCachedTranscript(videoId, language, response).catch(err =>
        console.error('[Orchestrator] Failed to cache transcript:', err)
      );

      onProgress?.({
        stage: 'completed',
        source: 'web_speech',
        message: `Successfully transcribed ${response.totalSentences} sentences`,
        percentage: 100
      });

      return response;

    } catch (error) {
      console.error(`[Orchestrator] ✗ Web Speech failed:`, error);

      const errorMessage = getUserFriendlyMessage(error, 'web_speech');

      onProgress?.({
        stage: 'error',
        source: 'web_speech',
        message: errorMessage,
        percentage: 100
      });

      return {
        status: 'error',
        source: 'none',
        transcript: [],
        message: errorMessage,
        totalSentences: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
        language,
        cached: false
      };
    }
  }

  // ============================================================================
  // Step 4: All Sources Failed
  // ============================================================================

  console.error(`[Orchestrator] ✗ All sources failed`);

  return {
    status: 'error',
    source: 'none',
    transcript: [],
    message: 'Could not extract transcript. Please try again or upload a transcript manually.',
    totalSentences: 0,
    confidence: 0,
    processingTime: Date.now() - startTime,
    language,
    cached: false
  };
}

/**
 * Get transcript with retry logic
 *
 * Automatically retries failed requests with exponential backoff
 *
 * @param videoId - YouTube video ID
 * @param config - Configuration options
 * @returns Promise resolving to unified transcript response
 */
export async function getTranscriptWithRetry(
  videoId: string,
  config: OrchestratorConfig = {}
): Promise<TranscriptResponse> {
  const maxRetries = config.maxRetries || DEFAULT_MAX_RETRIES;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Orchestrator] Attempt ${attempt}/${maxRetries}`);

    config.onProgress?.({
      stage: 'youtube_fetch',
      source: 'youtube',
      message: `Attempting to fetch transcript (${attempt}/${maxRetries})...`,
      percentage: 0,
      currentAttempt: attempt,
      maxAttempts: maxRetries
    });

    try {
      const result = await getTranscript(videoId, config);

      // Success or non-retryable error
      if (result.status === 'success' || result.source !== 'none') {
        return result;
      }

      // Check if error is retryable
      if (result.message.indexOf('Video not found') !== -1 ||
          result.message.indexOf('Invalid video ID') !== -1 ||
          result.message.indexOf('not supported') !== -1) {
        // Non-retryable errors
        return result;
      }

      lastError = result;

      // Retry with delay (if not last attempt)
      if (attempt < maxRetries) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] || 2000;
        console.log(`[Orchestrator] Retry ${attempt} failed, waiting ${delayMs}ms before next attempt...`);

        config.onProgress?.({
          stage: 'youtube_fetch',
          source: 'youtube',
          message: `Retrying in ${(delayMs / 1000).toFixed(1)}s...`,
          percentage: 0,
          currentAttempt: attempt,
          maxAttempts: maxRetries
        });

        await delay(delayMs);
      }

    } catch (error) {
      console.error(`[Orchestrator] Attempt ${attempt} threw error:`, error);
      lastError = error;

      // Retry with delay (if not last attempt)
      if (attempt < maxRetries) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] || 2000;
        await delay(delayMs);
      }
    }
  }

  // All retries exhausted
  console.error(`[Orchestrator] All ${maxRetries} attempts failed`);

  return lastError || {
    status: 'error',
    source: 'none',
    transcript: [],
    message: 'Failed to extract transcript after multiple attempts. Please try again later.',
    totalSentences: 0,
    confidence: 0,
    processingTime: 0,
    language: config.language || DEFAULT_LANGUAGE,
    cached: false
  };
}

/**
 * Prefetch and cache transcript for a video
 *
 * Useful for preloading transcripts in the background
 *
 * @param videoId - YouTube video ID
 * @param language - Language code
 */
export async function prefetchTranscript(
  videoId: string,
  language: string = DEFAULT_LANGUAGE
): Promise<void> {
  console.log(`[Orchestrator] Prefetching transcript for ${videoId} (${language})`);

  try {
    await getTranscript(videoId, { language, forceRefresh: false });
    console.log(`[Orchestrator] ✓ Prefetch complete for ${videoId}`);
  } catch (error) {
    console.error(`[Orchestrator] Prefetch failed for ${videoId}:`, error);
  }
}

/**
 * Get transcript source availability
 *
 * Checks which sources are available without actually fetching
 *
 * @returns Available transcript sources
 */
export function getAvailableSources(): {
  youtube: boolean;
  webSpeech: boolean;
} {
  return {
    youtube: true, // Always available (server-side)
    webSpeech: isWebSpeechSupported()
  };
}

/**
 * Validate video ID format
 *
 * @param videoId - YouTube video ID to validate
 * @returns True if valid, false otherwise
 */
export function validateVideoId(videoId: string): boolean {
  const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
  return VIDEO_ID_REGEX.test(videoId);
}
