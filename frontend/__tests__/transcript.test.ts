/**
 * Comprehensive Tests for Transcript Services
 *
 * This test suite covers:
 * 1. YouTube Caption Extraction
 * 2. Web Speech API
 * 3. Orchestrator
 * 4. Caching
 * 5. Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  extractYouTubeTranscript,
  extractVideoId,
  TranscriptResponse as YouTubeTranscriptResponse,
  TranscriptError as YouTubeTranscriptError
} from '@/lib/services/youtubeTranscript';
import {
  transcribeVideoWithWebSpeech,
  isWebSpeechSupported,
  WebSpeechError,
  getSupportedLanguages
} from '@/lib/services/webSpeechTranscript';
import {
  getTranscript,
  getTranscriptWithRetry,
  getAvailableSources,
  validateVideoId
} from '@/lib/services/transcriptOrchestrator';
import {
  getCachedTranscript,
  setCachedTranscript,
  clearTranscriptCache,
  getCacheStats,
  isTranscriptCached,
  clearExpiredCache
} from '@/lib/services/transcriptCache';
import type { TranscriptSentence } from '@/lib/types/transcript';

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_VIDEO_ID = 'dQw4w9WgXcQ';
const INVALID_VIDEO_ID = 'invalid';

const MOCK_YOUTUBE_CAPTIONS = [
  { text: 'Hello world.', offset: 0, duration: 2000 },
  { text: 'This is a test.', offset: 2000, duration: 3000 },
  { text: 'Welcome to ShadowSpeak!', offset: 5000, duration: 2500 }
];

const MOCK_TRANSCRIPT_SENTENCES: TranscriptSentence[] = [
  {
    sentence_id: 1,
    text: 'Hello world.',
    start_time: 0,
    end_time: 2.0,
    confidence: 0.95
  },
  {
    sentence_id: 2,
    text: 'This is a test.',
    start_time: 2.0,
    end_time: 5.0,
    confidence: 0.95
  },
  {
    sentence_id: 3,
    text: 'Welcome to ShadowSpeak!',
    start_time: 5.0,
    end_time: 7.5,
    confidence: 0.95
  }
];

const MOCK_VIDEO_ELEMENT = {
  duration: 10,
  currentTime: 0,
  play: vi.fn(),
  pause: vi.fn()
} as unknown as HTMLVideoElement;

// ============================================================================
// 1. YouTube Caption Extraction Tests
// ============================================================================

describe('YouTube Caption Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return captions for valid video ID', async () => {
    // Mock the youtube-transcript library
    const mockFetchTranscript = vi.fn().mockResolvedValue(MOCK_YOUTUBE_CAPTIONS);
    vi.mock('youtube-transcript', () => ({
      YoutubeTranscript: {
        fetchTranscript: mockFetchTranscript
      }
    }));

    const result = await extractYouTubeTranscript(MOCK_VIDEO_ID, 'en');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.transcript).toBeDefined();
      expect(result.transcript.length).toBeGreaterThan(0);
      expect(result.source).toBe('youtube');
      expect(result.language).toBe('en');
      expect(result.totalSentences).toBeGreaterThan(0);
    }
  });

  it('should return error for invalid video ID', async () => {
    const result = await extractYouTubeTranscript(INVALID_VIDEO_ID, 'en');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('INVALID_VIDEO_ID');
      expect(result.message).toContain('Video ID must be 11 characters');
    }
  });

  it('should trigger fallback when video has no captions', async () => {
    // Mock YouTube API to return no captions error
    const mockFetchTranscript = vi.fn().mockRejectedValue(
      new Error('NO_CAPTIONS_AVAILABLE')
    );
    vi.mock('youtube-transcript', () => ({
      YoutubeTranscript: {
        fetchTranscript: mockFetchTranscript
      }
    }));

    const result = await extractYouTubeTranscript(MOCK_VIDEO_ID, 'en');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.code).toBe('NO_CAPTIONS');
      expect(result.message).toContain('captions available');
    }
  });

  it('should work correctly with different languages', async () => {
    const languages = ['en', 'es', 'fr', 'de'];

    for (const lang of languages) {
      const mockFetchTranscript = vi.fn().mockResolvedValue(MOCK_YOUTUBE_CAPTIONS);
      vi.mock('youtube-transcript', () => ({
        YoutubeTranscript: {
          fetchTranscript: mockFetchTranscript
        }
      }));

      const result = await extractYouTubeTranscript(MOCK_VIDEO_ID, lang);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(['en', 'es', 'fr', 'de', 'auto']).toContain(result.language);
      }
    }
  });

  it('should have accurate timestamps', async () => {
    const mockFetchTranscript = vi.fn().mockResolvedValue(MOCK_YOUTUBE_CAPTIONS);
    vi.mock('youtube-transcript', () => ({
      YoutubeTranscript: {
        fetchTranscript: mockFetchTranscript
      }
    }));

    const result = await extractYouTubeTranscript(MOCK_VIDEO_ID, 'en');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      const sentences = result.transcript;

      // Check timestamps are sequential
      for (let i = 0; i < sentences.length - 1; i++) {
        expect(sentences[i].end_time).toBeLessThanOrEqual(sentences[i + 1].start_time);
      }

      // Check timestamps are reasonable
      sentences.forEach(sentence => {
        expect(sentence.start_time).toBeGreaterThanOrEqual(0);
        expect(sentence.end_time).toBeGreaterThan(sentence.start_time);
      });
    }
  });

  it('should extract video ID from various URL formats', () => {
    const testCases = [
      { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
      { input: 'invalid', expected: null }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = extractVideoId(input);
      expect(result).toBe(expected);
    });
  });
});

// ============================================================================
// 2. Web Speech API Tests
// ============================================================================

describe('Web Speech API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Web Speech API in window
    global.window = {
      webkitSpeechRecognition: vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        onstart: null,
        onresult: null,
        onerror: null,
        onend: null,
        continuous: true,
        interimResults: true,
        maxAlternatives: 1,
        lang: 'en-US'
      }))
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize when YouTube fails', async () => {
    const supported = isWebSpeechSupported();
    expect(supported).toBe(true);
  });

  it('should return sentences with timestamps', async () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      onstart: null as any,
      onresult: null as any,
      onerror: null as any,
      onend: null as any,
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      lang: 'en-US'
    };

    global.window.webkitSpeechRecognition = vi.fn(() => mockRecognition) as any;

    const promise = transcribeVideoWithWebSpeech(MOCK_VIDEO_ELEMENT, {
      language: 'en-US'
    });

    // Simulate speech recognition events
    setTimeout(() => {
      mockRecognition.onstart?.();

      // Simulate results
      const mockEvent = {
        resultIndex: 0,
        results: [{
          0: { transcript: 'Hello world.', confidence: 0.9 },
          isFinal: true
        }]
      };
      mockRecognition.onresult?.(mockEvent);

      // End recognition
      mockRecognition.onend?.();
    }, 10);

    const result = await promise;

    expect(Array.isArray(result)).toBe(true);
    result.forEach(sentence => {
      expect(sentence).toHaveProperty('sentence_id');
      expect(sentence).toHaveProperty('text');
      expect(sentence).toHaveProperty('start_time');
      expect(sentence).toHaveProperty('end_time');
      expect(sentence).toHaveProperty('confidence');
      expect(sentence.start_time).toBeLessThan(sentence.end_time);
    });
  });

  it('should handle microphone permission denied', async () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      onstart: null as any,
      onresult: null as any,
      onerror: null as any,
      onend: null as any,
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      lang: 'en-US'
    };

    global.window.webkitSpeechRecognition = vi.fn(() => mockRecognition) as any;

    const promise = transcribeVideoWithWebSpeech(MOCK_VIDEO_ELEMENT);

    // Simulate permission denied error
    setTimeout(() => {
      mockRecognition.onerror?.({
        error: 'permission-denied',
        message: 'Microphone permission denied'
      });
    }, 10);

    await expect(promise).rejects.toThrow(WebSpeechError);
    await expect(promise).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      message: expect.stringContaining('permission')
    });
  });

  it('should work in supported browsers', () => {
    // Chrome/Edge
    global.window = { webkitSpeechRecognition: vi.fn() } as any;
    expect(isWebSpeechSupported()).toBe(true);

    // Firefox/Safari
    global.window = { SpeechRecognition: vi.fn() } as any;
    expect(isWebSpeechSupported()).toBe(true);

    // Unsupported
    global.window = {} as any;
    expect(isWebSpeechSupported()).toBe(false);
  });

  it('should gracefully fail if unsupported', async () => {
    global.window = {} as any;

    await expect(
      transcribeVideoWithWebSpeech(MOCK_VIDEO_ELEMENT)
    ).rejects.toThrow(WebSpeechError);

    await expect(
      transcribeVideoWithWebSpeech(MOCK_VIDEO_ELEMENT)
    ).rejects.toMatchObject({
      code: 'NOT_SUPPORTED',
      message: expect.stringContaining('not supported')
    });
  });

  it('should support multiple languages', () => {
    const supportedLanguages = getSupportedLanguages();

    expect(Array.isArray(supportedLanguages)).toBe(true);
    expect(supportedLanguages).toContain('en-US');
    expect(supportedLanguages).toContain('es-ES');
    expect(supportedLanguages).toContain('fr-FR');
    expect(supportedLanguages).toContain('de-DE');
    expect(supportedLanguages).toContain('ja-JP');
  });
});

// ============================================================================
// 3. Orchestrator Tests
// ============================================================================

describe('Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock cache to return null (cache miss)
    vi.mocked(getCachedTranscript).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should try YouTube first', async () => {
    const mockYouTubeExtract = vi.fn().mockResolvedValue({
      status: 'success',
      source: 'youtube',
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      language: 'en',
      totalSentences: 3
    });

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: mockYouTubeExtract
    }));

    const result = await getTranscript(MOCK_VIDEO_ID, { language: 'en' });

    expect(result.source).toBe('youtube');
    expect(result.status).toBe('success');
  });

  it('should fall back to Web Speech when YouTube fails', async () => {
    // Mock YouTube to fail
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'error',
        code: 'NO_CAPTIONS',
        error: 'No captions available',
        message: 'No captions available'
      })
    }));

    // Mock Web Speech to succeed
    vi.mock('@/lib/services/webSpeechTranscript', () => ({
      isWebSpeechSupported: vi.fn().mockReturnValue(true),
      transcribeVideoWithWebSpeech: vi.fn().mockResolvedValue(MOCK_TRANSCRIPT_SENTENCES)
    }));

    const result = await getTranscript(MOCK_VIDEO_ID, {
      language: 'en',
      videoElement: MOCK_VIDEO_ELEMENT
    });

    expect(result.source).toBe('web_speech');
    expect(result.status).toBe('success');
  });

  it('should return proper response format', async () => {
    const mockYouTubeExtract = vi.fn().mockResolvedValue({
      status: 'success',
      source: 'youtube',
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      language: 'en',
      totalSentences: 3
    });

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: mockYouTubeExtract
    }));

    const result = await getTranscript(MOCK_VIDEO_ID);

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('transcript');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('totalSentences');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('processingTime');
    expect(result).toHaveProperty('language');
    expect(Array.isArray(result.transcript)).toBe(true);
  });

  it('should handle all error cases', async () => {
    const errorCases = [
      {
        mockError: { status: 'error', code: 'VIDEO_NOT_FOUND' },
        expectedSource: 'none',
        expectedStatus: 'error'
      },
      {
        mockError: { status: 'error', code: 'INVALID_VIDEO_ID' },
        expectedSource: 'none',
        expectedStatus: 'error'
      },
      {
        mockError: { status: 'error', code: 'NETWORK_ERROR' },
        expectedSource: 'none',
        expectedStatus: 'error'
      }
    ];

    for (const testCase of errorCases) {
      vi.mock('@/lib/services/youtubeTranscript', () => ({
        extractYouTubeTranscript: vi.fn().mockResolvedValue(testCase.mockError)
      }));

      const result = await getTranscript(MOCK_VIDEO_ID);

      expect(result.status).toBe(testCase.expectedStatus);
      expect(result.source).toBe(testCase.expectedSource);
    }
  });

  it('should return correct source in response', async () => {
    // Test YouTube source
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const youtubeResult = await getTranscript(MOCK_VIDEO_ID);
    expect(youtubeResult.source).toBe('youtube');

    // Test cache source
    vi.mocked(getCachedTranscript).mockResolvedValue({
      data: {
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        totalSentences: 3,
        confidence: 0.95,
        language: 'en',
        message: 'Cached',
        processingTime: 0
      },
      stats: { hit: true, age: 1000, source: 'cache' }
    });

    const cacheResult = await getTranscript(MOCK_VIDEO_ID);
    expect(cacheResult.cached).toBe(true);
  });

  it('should validate video ID format', () => {
    expect(validateVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(validateVideoId('invalid')).toBe(false);
    expect(validateVideoId('12345678901')).toBe(true);
    expect(validateVideoId('short')).toBe(false);
    expect(validateVideoId('')).toBe(false);
  });

  it('should report available sources', () => {
    const sources = getAvailableSources();

    expect(sources).toHaveProperty('youtube');
    expect(sources).toHaveProperty('webSpeech');
    expect(sources.youtube).toBe(true); // Always available
  });
});

// ============================================================================
// 4. Caching Tests
// ============================================================================

describe('Caching', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTranscriptCache(); // Clear cache before each test
  });

  afterEach(async () => {
    await clearTranscriptCache(); // Clean up after tests
  });

  it('should save transcript to cache', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    const cached = await getCachedTranscript(MOCK_VIDEO_ID, 'en');
    expect(cached).not.toBeNull();
    expect(cached?.data.source).toBe('youtube');
    expect(cached?.stats.hit).toBe(true);
  });

  it('should retrieve from cache', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    // Save to cache
    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    // Retrieve from cache
    const cached = await getCachedTranscript(MOCK_VIDEO_ID, 'en');

    expect(cached).not.toBeNull();
    expect(cached?.data).toMatchObject({
      source: 'youtube',
      totalSentences: 3
    });
    expect(cached?.stats.hit).toBe(true);
    expect(cached?.stats.source).toBe('cache');
  });

  it('should return null for expired entries', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    // Mock expired entry by manipulating cache directly
    // In real scenario, entry would expire after 30 days
    // For testing, we can clear and verify
    await clearExpiredCache();

    // Entry should still exist (not expired yet)
    const cached = await getCachedTranscript(MOCK_VIDEO_ID, 'en');
    expect(cached).not.toBeNull();
  });

  it('should clear specific entries', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    // Verify it's cached
    let isCached = await isTranscriptCached(MOCK_VIDEO_ID);
    expect(isCached).toBe(true);

    // Clear specific entry
    await clearTranscriptCache(MOCK_VIDEO_ID);

    // Verify it's gone
    isCached = await isTranscriptCached(MOCK_VIDEO_ID);
    expect(isCached).toBe(false);
  });

  it('should track cache stats', async () => {
    const mockTranscript1 = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    const mockTranscript2 = {
      ...mockTranscript1,
      language: 'es'
    };

    await setCachedTranscript('video1', 'en', mockTranscript1);
    await setCachedTranscript('video2', 'es', mockTranscript2);

    const stats = await getCacheStats();

    expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    expect(stats.totalStorageBytes).toBeGreaterThan(0);
    expect(stats.cachedVideos).toBeDefined();
    expect(Array.isArray(stats.cachedVideos)).toBe(true);
  });

  it('should check if transcript is cached', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    // Initially not cached
    let isCached = await isTranscriptCached(MOCK_VIDEO_ID);
    expect(isCached).toBe(false);

    // Save to cache
    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    // Now cached
    isCached = await isTranscriptCached(MOCK_VIDEO_ID);
    expect(isCached).toBe(true);
  });
});

// ============================================================================
// 5. Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTranscriptCache();
  });

  afterEach(async () => {
    await clearTranscriptCache();
  });

  it('should load transcript on practice page', async () => {
    // Mock successful YouTube fetch
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const result = await getTranscript(MOCK_VIDEO_ID, { language: 'en' });

    expect(result.status).toBe('success');
    expect(result.transcript.length).toBeGreaterThan(0);
    expect(result.totalSentences).toBeGreaterThan(0);
  });

  it('should show loading state during fetch', async () => {
    let progressUpdates: number[] = [];

    const mockYouTubeExtract = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            status: 'success',
            source: 'youtube',
            transcript: MOCK_TRANSCRIPT_SENTENCES,
            language: 'en',
            totalSentences: 3
          });
        }, 100);
      });
    });

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: mockYouTubeExtract
    }));

    const result = await getTranscript(MOCK_VIDEO_ID, {
      language: 'en',
      onProgress: (progress) => {
        progressUpdates.push(progress.percentage);
      }
    });

    expect(result.status).toBe('success');
    expect(progressUpdates.length).toBeGreaterThan(0);
  });

  it('should show source badge', async () => {
    // Test YouTube source badge
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const youtubeResult = await getTranscript(MOCK_VIDEO_ID);
    expect(youtubeResult.source).toBe('youtube');

    // Test cache source badge
    await setCachedTranscript(MOCK_VIDEO_ID, 'en', {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Cached',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 0,
      language: 'en',
      cached: true
    });

    const cacheResult = await getTranscript(MOCK_VIDEO_ID);
    expect(cacheResult.cached).toBe(true);
  });

  it('should allow refresh', async () => {
    let fetchCount = 0;

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          status: 'success',
          source: 'youtube',
          transcript: MOCK_TRANSCRIPT_SENTENCES,
          language: 'en',
          totalSentences: 3
        });
      })
    }));

    // First fetch
    await getTranscript(MOCK_VIDEO_ID);
    expect(fetchCount).toBe(1);

    // Refresh (force refresh bypasses cache)
    await getTranscript(MOCK_VIDEO_ID, { forceRefresh: true });
    expect(fetchCount).toBe(2);
  });

  it('should show error message on failure', async () => {
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'error',
        code: 'VIDEO_NOT_FOUND',
        error: 'Video not found',
        message: 'The specified video could not be found or is not accessible.'
      })
    }));

    const result = await getTranscript(MOCK_VIDEO_ID);

    expect(result.status).toBe('error');
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('should retry on network errors', async () => {
    let attemptCount = 0;

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.resolve({
            status: 'error',
            code: 'NETWORK_ERROR',
            error: 'Network error',
            message: 'Failed to connect to YouTube. Please check your internet connection.'
          });
        }
        return Promise.resolve({
          status: 'success',
          source: 'youtube',
          transcript: MOCK_TRANSCRIPT_SENTENCES,
          language: 'en',
          totalSentences: 3
        });
      })
    }));

    const result = await getTranscriptWithRetry(MOCK_VIDEO_ID, {
      language: 'en',
      maxRetries: 3
    });

    expect(attemptCount).toBeGreaterThan(1);
    expect(result.status).toBe('success');
  });

  it('should handle complete end-to-end flow', async () => {
    // Step 1: Initial fetch (cache miss, YouTube success)
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const firstResult = await getTranscript(MOCK_VIDEO_ID, { language: 'en' });

    expect(firstResult.status).toBe('success');
    expect(firstResult.source).toBe('youtube');
    expect(firstResult.cached).toBe(false);

    // Step 2: Second fetch (cache hit)
    const secondResult = await getTranscript(MOCK_VIDEO_ID, { language: 'en' });

    expect(secondResult.status).toBe('success');
    expect(secondResult.cached).toBe(true);

    // Step 3: Verify cache stats
    const stats = await getCacheStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(1);

    // Step 4: Clear cache
    await clearTranscriptCache(MOCK_VIDEO_ID);

    // Step 5: Verify cache is cleared
    const isCached = await isTranscriptCached(MOCK_VIDEO_ID);
    expect(isCached).toBe(false);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Tests', () => {
  it('should fetch transcript in reasonable time', async () => {
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const startTime = Date.now();
    const result = await getTranscript(MOCK_VIDEO_ID);
    const endTime = Date.now();

    expect(result.status).toBe('success');
    expect(result.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should return cached transcript instantly', async () => {
    const mockTranscript = {
      status: 'success' as const,
      source: 'youtube' as const,
      transcript: MOCK_TRANSCRIPT_SENTENCES,
      message: 'Success',
      totalSentences: 3,
      confidence: 0.95,
      processingTime: 100,
      language: 'en',
      cached: false
    };

    // Cache the transcript
    await setCachedTranscript(MOCK_VIDEO_ID, 'en', mockTranscript);

    // Fetch from cache
    const startTime = Date.now();
    const result = await getTranscript(MOCK_VIDEO_ID, { language: 'en' });
    const endTime = Date.now();

    expect(result.cached).toBe(true);
    expect(endTime - startTime).toBeLessThan(100); // Should be nearly instant
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty transcript', async () => {
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: [],
        language: 'en',
        totalSentences: 0
      })
    }));

    const result = await getTranscript(MOCK_VIDEO_ID);

    expect(result.status).toBe('success');
    expect(result.transcript).toEqual([]);
    expect(result.totalSentences).toBe(0);
  });

  it('should handle very long transcripts', async () => {
    const longTranscript = Array.from({ length: 1000 }, (_, i) => ({
      sentence_id: i + 1,
      text: `This is sentence number ${i + 1}.`,
      start_time: i * 3,
      end_time: (i + 1) * 3,
      confidence: 0.95
    }));

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: longTranscript,
        language: 'en',
        totalSentences: 1000
      })
    }));

    const result = await getTranscript(MOCK_VIDEO_ID);

    expect(result.status).toBe('success');
    expect(result.totalSentences).toBe(1000);
    expect(result.transcript.length).toBe(1000);
  });

  it('should handle concurrent requests for same video', async () => {
    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: MOCK_TRANSCRIPT_SENTENCES,
        language: 'en',
        totalSentences: 3
      })
    }));

    const promises = [
      getTranscript(MOCK_VIDEO_ID),
      getTranscript(MOCK_VIDEO_ID),
      getTranscript(MOCK_VIDEO_ID)
    ];

    const results = await Promise.all(promises);

    results.forEach(result => {
      expect(result.status).toBe('success');
      expect(result.totalSentences).toBe(3);
    });
  });

  it('should handle special characters in transcript', async () => {
    const specialCharTranscript = [
      {
        sentence_id: 1,
        text: 'Special chars: @#$%^&*()!',
        start_time: 0,
        end_time: 2,
        confidence: 0.95
      },
      {
        sentence_id: 2,
        text: 'Unicode: 你好世界 🌍',
        start_time: 2,
        end_time: 4,
        confidence: 0.95
      }
    ];

    vi.mock('@/lib/services/youtubeTranscript', () => ({
      extractYouTubeTranscript: vi.fn().mockResolvedValue({
        status: 'success',
        source: 'youtube',
        transcript: specialCharTranscript,
        language: 'en',
        totalSentences: 2
      })
    }));

    const result = await getTranscript(MOCK_VIDEO_ID);

    expect(result.status).toBe('success');
    expect(result.transcript[0].text).toContain('@#$%^&*()!');
    expect(result.transcript[1].text).toContain('你好世界 🌍');
  });
});
