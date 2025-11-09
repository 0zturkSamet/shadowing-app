/**
 * YouTube Transcript Service for ShadowSpeak
 *
 * Extracts captions from YouTube videos using youtube-transcript library.
 * Provides sentence-level transcriptions with timestamps for language learning.
 *
 * @module youtubeTranscript
 */

import { YoutubeTranscript } from 'youtube-transcript';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a single sentence in the transcript with timing information
 */
export interface TranscriptSentence {
  sentence_id: number;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  source: 'youtube';
}

/**
 * Complete transcript response with metadata
 */
export interface TranscriptResponse {
  transcript: TranscriptSentence[];
  status: 'success' | 'error';
  source: 'youtube';
  language: string;
  totalSentences: number;
  videoId?: string;
}

/**
 * Error response structure
 */
export interface TranscriptError {
  status: 'error';
  error: string;
  code: 'VIDEO_NOT_FOUND' | 'NO_CAPTIONS' | 'NETWORK_ERROR' | 'INVALID_VIDEO_ID' | 'PARSE_ERROR';
  message: string;
  videoId?: string;
}

/**
 * Raw caption chunk from YouTube
 */
interface RawCaption {
  text: string;
  offset: number;
  duration: number;
}

// ============================================================================
// Constants
// ============================================================================

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const YOUTUBE_CONFIDENCE = 0.95; // YouTube captions are generally high quality
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Sentence ending patterns
const SENTENCE_ENDINGS = /[.!?]+\s+|[.!?]+$/;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates YouTube video ID format
 *
 * @param videoId - YouTube video ID to validate
 * @returns True if valid, false otherwise
 */
function isValidVideoId(videoId: string): boolean {
  return VIDEO_ID_REGEX.test(videoId);
}

/**
 * Delays execution for retry logic
 *
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parses raw captions into sentence-level segments
 *
 * Combines caption chunks into complete sentences while maintaining
 * accurate timing information.
 *
 * @param rawCaptions - Raw caption chunks from YouTube
 * @returns Array of sentence-level transcript segments
 */
function parseIntoSentences(rawCaptions: RawCaption[]): TranscriptSentence[] {
  const sentences: TranscriptSentence[] = [];
  let currentSentence = '';
  let currentStartTime = 0;
  let currentEndTime = 0;
  let sentenceId = 1;

  for (let i = 0; i < rawCaptions.length; i++) {
    const caption = rawCaptions[i];
    const text = caption.text.trim();
    const startTime = caption.offset / 1000; // Convert to seconds
    const duration = caption.duration / 1000;
    const endTime = startTime + duration;

    // Initialize start time for new sentence
    if (currentSentence === '') {
      currentStartTime = startTime;
    }

    currentSentence += (currentSentence ? ' ' : '') + text;
    currentEndTime = endTime;

    // Check if this caption chunk ends a sentence
    const endsWithPunctuation = /[.!?]$/.test(text);
    const isLastCaption = i === rawCaptions.length - 1;

    if (endsWithPunctuation || isLastCaption) {
      // Split by sentence endings in case there are multiple sentences
      const splitSentences = currentSentence.split(SENTENCE_ENDINGS).filter(s => s.trim());

      for (let j = 0; j < splitSentences.length; j++) {
        const sentence = splitSentences[j].trim();
        if (sentence) {
          // Estimate timing for multiple sentences in one chunk
          const sentenceRatio = j / Math.max(splitSentences.length, 1);
          const nextSentenceRatio = (j + 1) / Math.max(splitSentences.length, 1);
          const timeRange = currentEndTime - currentStartTime;

          sentences.push({
            sentence_id: sentenceId++,
            text: sentence,
            start_time: parseFloat((currentStartTime + timeRange * sentenceRatio).toFixed(2)),
            end_time: parseFloat((currentStartTime + timeRange * nextSentenceRatio).toFixed(2)),
            confidence: YOUTUBE_CONFIDENCE,
            source: 'youtube'
          });
        }
      }

      // Reset for next sentence
      currentSentence = '';
    }
  }

  // Handle any remaining text
  if (currentSentence.trim()) {
    sentences.push({
      sentence_id: sentenceId++,
      text: currentSentence.trim(),
      start_time: currentStartTime,
      end_time: currentEndTime,
      confidence: YOUTUBE_CONFIDENCE,
      source: 'youtube'
    });
  }

  return sentences;
}

/**
 * Attempts to fetch transcript with retry logic
 *
 * @param videoId - YouTube video ID
 * @param language - Language code (e.g., 'en', 'es')
 * @param attempt - Current attempt number
 * @returns Raw caption data
 */
async function fetchWithRetry(
  videoId: string,
  language: string,
  attempt: number = 1
): Promise<RawCaption[]> {
  try {
    console.log(`[YouTubeTranscript] Fetching captions for video ${videoId} in language ${language} (attempt ${attempt}/${RETRY_ATTEMPTS})`);

    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: language,
    });

    return transcript as RawCaption[];
  } catch (error: any) {
    if (attempt < RETRY_ATTEMPTS) {
      const delayTime = RETRY_DELAY_MS * attempt;
      console.log(`[YouTubeTranscript] Retry after ${delayTime}ms...`);
      await delay(delayTime);
      return fetchWithRetry(videoId, language, attempt + 1);
    }
    throw error;
  }
}

/**
 * Tries to fetch transcript with language fallback
 *
 * @param videoId - YouTube video ID
 * @param preferredLanguage - Preferred language code
 * @returns Transcript data and actual language used
 */
async function fetchWithLanguageFallback(
  videoId: string,
  preferredLanguage: string
): Promise<{ captions: RawCaption[]; language: string }> {
  // Try preferred language first
  try {
    const captions = await fetchWithRetry(videoId, preferredLanguage);
    console.log(`[YouTubeTranscript] Successfully fetched captions in ${preferredLanguage}`);
    return { captions, language: preferredLanguage };
  } catch (error: any) {
    console.log(`[YouTubeTranscript] Captions not available in ${preferredLanguage}, trying fallback...`);
  }

  // Fallback to English if not already tried
  if (preferredLanguage !== 'en') {
    try {
      const captions = await fetchWithRetry(videoId, 'en');
      console.log(`[YouTubeTranscript] Fallback to English successful`);
      return { captions, language: 'en' };
    } catch (error: any) {
      console.log(`[YouTubeTranscript] English captions not available, trying any available...`);
    }
  }

  // Last resort: try to fetch without language specification
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const captions = transcript as RawCaption[];
    console.log(`[YouTubeTranscript] Fetched captions in default language`);
    return { captions, language: 'auto' };
  } catch (error: any) {
    throw new Error('NO_CAPTIONS_AVAILABLE');
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Extracts YouTube video transcript and parses it into sentences
 *
 * This function:
 * 1. Validates the video ID
 * 2. Fetches captions from YouTube (with retry logic)
 * 3. Attempts language fallback if requested language unavailable
 * 4. Parses captions into sentence-level segments
 * 5. Returns formatted transcript with timing information
 *
 * @param videoId - YouTube video ID (11 characters, e.g., "dQw4w9WgXcQ")
 * @param language - Language code (default: 'en'). Falls back to English then any available.
 * @returns Promise resolving to transcript response or error
 *
 * @example
 * ```typescript
 * const result = await extractYouTubeTranscript('dQw4w9WgXcQ', 'en');
 * if (result.status === 'success') {
 *   console.log(`Extracted ${result.totalSentences} sentences`);
 *   result.transcript.forEach(sentence => {
 *     console.log(`${sentence.start_time}s: ${sentence.text}`);
 *   });
 * }
 * ```
 */
export async function extractYouTubeTranscript(
  videoId: string,
  language: string = 'en'
): Promise<TranscriptResponse | TranscriptError> {
  console.log(`[YouTubeTranscript] Starting extraction for video: ${videoId}, language: ${language}`);

  // Validate video ID
  if (!isValidVideoId(videoId)) {
    console.error(`[YouTubeTranscript] Invalid video ID format: ${videoId}`);
    return {
      status: 'error',
      error: 'Invalid video ID format',
      code: 'INVALID_VIDEO_ID',
      message: 'Video ID must be 11 characters long and contain only alphanumeric characters, hyphens, and underscores',
      videoId
    };
  }

  try {
    // Fetch captions with language fallback
    const { captions, language: actualLanguage } = await fetchWithLanguageFallback(videoId, language);

    if (!captions || captions.length === 0) {
      console.warn(`[YouTubeTranscript] No captions found for video ${videoId}`);
      return {
        status: 'error',
        error: 'No captions available',
        code: 'NO_CAPTIONS',
        message: 'This video does not have captions available. Consider using Web Speech API fallback.',
        videoId
      };
    }

    console.log(`[YouTubeTranscript] Received ${captions.length} caption chunks`);

    // Parse captions into sentences
    const sentences = parseIntoSentences(captions);

    console.log(`[YouTubeTranscript] Successfully parsed ${sentences.length} sentences`);
    console.log(`[YouTubeTranscript] Language used: ${actualLanguage}`);
    console.log(`[YouTubeTranscript] Time range: ${sentences[0]?.start_time}s - ${sentences[sentences.length - 1]?.end_time}s`);

    return {
      transcript: sentences,
      status: 'success',
      source: 'youtube',
      language: actualLanguage,
      totalSentences: sentences.length,
      videoId
    };

  } catch (error: any) {
    console.error(`[YouTubeTranscript] Error extracting transcript:`, error);

    // Determine error type
    const errorMessage = error.message || String(error);

    if (errorMessage.includes('NO_CAPTIONS_AVAILABLE')) {
      return {
        status: 'error',
        error: 'No captions available',
        code: 'NO_CAPTIONS',
        message: 'This video does not have captions available in any language. Consider using Web Speech API fallback.',
        videoId
      };
    }

    if (errorMessage.includes('Video unavailable') || errorMessage.includes('404')) {
      return {
        status: 'error',
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND',
        message: 'The specified video could not be found or is not accessible.',
        videoId
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ETIMEDOUT')) {
      return {
        status: 'error',
        error: 'Network error',
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to YouTube after multiple attempts. Please check your internet connection.',
        videoId
      };
    }

    // Generic parse error
    return {
      status: 'error',
      error: errorMessage,
      code: 'PARSE_ERROR',
      message: 'An unexpected error occurred while parsing the transcript.',
      videoId
    };
  }
}

/**
 * Extracts video ID from various YouTube URL formats
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Direct video ID
 *
 * @param input - YouTube URL or video ID
 * @returns Extracted video ID or null if invalid
 *
 * @example
 * ```typescript
 * extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
 * extractVideoId('dQw4w9WgXcQ') // 'dQw4w9WgXcQ'
 * ```
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;

  // If it's already a valid video ID
  if (isValidVideoId(input)) {
    return input;
  }

  // Extract from URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
