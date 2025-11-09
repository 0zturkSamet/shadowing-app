# Transcript Orchestrator - Usage Guide

## Overview

The Transcript Orchestrator provides a unified interface for extracting YouTube video transcripts using multiple sources with intelligent fallback and caching.

## Features

- **Priority-based source selection**: YouTube captions → Web Speech API
- **IndexedDB caching**: Zero-latency on repeated requests (30-day TTL)
- **Progress tracking**: Real-time feedback for users
- **Retry logic**: Exponential backoff for network failures
- **Error handling**: User-friendly error messages
- **Cancellation support**: Stop ongoing transcription

## Quick Start

### Basic Usage

```typescript
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

// Simple usage - get transcript with defaults
const result = await getTranscript('dQw4w9WgXcQ');

if (result.status === 'success') {
  console.log(`Source: ${result.source}`); // 'youtube' or 'web_speech'
  console.log(`Sentences: ${result.totalSentences}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Time: ${result.processingTime}ms`);

  result.transcript.forEach((sentence) => {
    console.log(`[${sentence.start_time}s] ${sentence.text}`);
  });
}
```

### With Progress Tracking

```typescript
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

const result = await getTranscript('dQw4w9WgXcQ', {
  language: 'en',
  onProgress: (progress) => {
    console.log(`[${progress.stage}] ${progress.message} (${progress.percentage}%)`);

    // Update UI loading state
    setLoadingMessage(progress.message);
    setLoadingPercentage(progress.percentage);
  }
});
```

### With Web Speech Fallback

```typescript
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

// Provide video element for Web Speech API fallback
const videoElement = document.querySelector('video');

const result = await getTranscript('dQw4w9WgXcQ', {
  language: 'en',
  videoElement, // Required for Web Speech fallback
  onProgress: (progress) => {
    if (progress.source === 'web_speech') {
      console.log('Using live transcription...');
    }
  }
});
```

### With Retry Logic

```typescript
import { getTranscriptWithRetry } from '@/lib/services/transcriptOrchestrator';

const result = await getTranscriptWithRetry('dQw4w9WgXcQ', {
  language: 'en',
  maxRetries: 5, // Will retry up to 5 times
  onProgress: (progress) => {
    if (progress.currentAttempt) {
      console.log(`Attempt ${progress.currentAttempt}/${progress.maxAttempts}`);
    }
  }
});
```

### Force Refresh (Skip Cache)

```typescript
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

// Skip cache and fetch fresh transcript
const result = await getTranscript('dQw4w9WgXcQ', {
  forceRefresh: true
});
```

### Prefetch Transcripts

```typescript
import { prefetchTranscript } from '@/lib/services/transcriptOrchestrator';

// Preload transcript in background
await prefetchTranscript('dQw4w9WgXcQ', 'en');

// Later, when user requests it, it will be instant from cache
const result = await getTranscript('dQw4w9WgXcQ', { language: 'en' });
console.log(result.cached); // true
```

## Configuration Options

```typescript
interface OrchestratorConfig {
  // Language code (e.g., 'en', 'es', 'fr')
  language?: string;

  // Skip cache and fetch fresh transcript
  forceRefresh?: boolean;

  // Force specific source ('youtube' or 'web_speech')
  preferredSource?: TranscriptSource;

  // Maximum retry attempts (default: 3)
  maxRetries?: number;

  // Progress callback
  onProgress?: (progress: OrchestratorProgress) => void;

  // Video element (required for Web Speech fallback)
  videoElement?: HTMLVideoElement;
}
```

## Response Format

```typescript
interface TranscriptResponse {
  status: 'success' | 'partial' | 'error';
  source: 'youtube' | 'web_speech' | 'none';
  transcript: TranscriptSentence[];
  message: string; // Success or error description
  totalSentences: number;
  confidence: number; // 0-1 average confidence
  processingTime: number; // milliseconds
  language: string;
  cached?: boolean; // true if loaded from cache
  cacheAge?: number; // milliseconds since cached
}
```

## Cache Management

### Get Cache Statistics

```typescript
import { getCacheStatistics } from '@/lib/services/transcriptCache';

const stats = await getCacheStatistics();
console.log(`Total entries: ${stats.totalEntries}`);
console.log(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
```

### Clear Expired Cache

```typescript
import { clearExpiredCache } from '@/lib/services/transcriptCache';

const deletedCount = await clearExpiredCache();
console.log(`Cleared ${deletedCount} expired entries`);
```

### Clear Specific Video Cache

```typescript
import { clearVideoCache } from '@/lib/services/transcriptCache';

await clearVideoCache('dQw4w9WgXcQ');
```

### Clear All Cache

```typescript
import { clearAllCache } from '@/lib/services/transcriptCache';

await clearAllCache();
```

## Error Handling

### Handle Errors Gracefully

```typescript
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

const result = await getTranscript('dQw4w9WgXcQ');

if (result.status === 'error') {
  // User-friendly error message
  console.error(result.message);

  // Handle specific cases
  if (result.message.includes('Video not found')) {
    // Show error: invalid video
  } else if (result.message.includes('not supported')) {
    // Show error: browser compatibility
  } else {
    // Show generic error + retry option
  }
}
```

### Common Error Messages

| Error | Description | Solution |
|-------|-------------|----------|
| "Video not found" | Invalid video ID or video unavailable | Check video ID and accessibility |
| "Invalid video ID" | Video ID format is incorrect | Ensure 11-character YouTube ID |
| "No captions available" | Video has no captions | Web Speech fallback will attempt |
| "Web Speech API not supported" | Browser doesn't support API | Use Chrome, Edge, or Safari |
| "Network error" | Connection issues | Check internet connection |
| "No speech detected" | Video has no clear audio | Try different video |

## Best Practices

### 1. Always Provide Video Element for Fallback

```typescript
// Good: Web Speech fallback available
const result = await getTranscript(videoId, {
  videoElement: videoRef.current
});

// Bad: Web Speech fallback not available
const result = await getTranscript(videoId);
```

### 2. Show Progress to Users

```typescript
// Good: User sees what's happening
const result = await getTranscript(videoId, {
  onProgress: (progress) => {
    setLoadingMessage(progress.message);
    setLoadingPercentage(progress.percentage);
  }
});

// Bad: User sees nothing
const result = await getTranscript(videoId);
```

### 3. Handle Both Success and Error Cases

```typescript
// Good: Handle all cases
const result = await getTranscript(videoId);

if (result.status === 'success') {
  // Show transcript
  setTranscript(result.transcript);
} else {
  // Show error message
  showError(result.message);
}

// Bad: Assume success
const result = await getTranscript(videoId);
setTranscript(result.transcript); // May be empty!
```

### 4. Use Retry Logic for Network Issues

```typescript
// Good: Retry on failures
const result = await getTranscriptWithRetry(videoId, {
  maxRetries: 3
});

// Bad: No retry on transient failures
const result = await getTranscript(videoId);
```

### 5. Prefetch for Better UX

```typescript
// Good: Prefetch when user selects video
onVideoSelected(videoId) {
  prefetchTranscript(videoId, language); // Preload
}

// Later when user clicks "Start"
const result = await getTranscript(videoId); // Instant from cache!

// Bad: Fetch only when needed
onStartPractice() {
  const result = await getTranscript(videoId); // User waits...
}
```

## React Component Example

```typescript
import { useState } from 'react';
import { getTranscript } from '@/lib/services/transcriptOrchestrator';

function TranscriptLoader({ videoId, videoRef }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [transcript, setTranscript] = useState(null);
  const [error, setError] = useState(null);

  const loadTranscript = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTranscript(videoId, {
        language: 'en',
        videoElement: videoRef.current,
        onProgress: (progress) => {
          setProgress(progress.message);
        }
      });

      if (result.status === 'success') {
        setTranscript(result.transcript);

        // Show source indicator
        if (result.cached) {
          console.log('Loaded from cache instantly!');
        } else if (result.source === 'youtube') {
          console.log('Loaded YouTube captions');
        } else if (result.source === 'web_speech') {
          console.log('Live transcription completed');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load transcript. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div>Loading: {progress}</div>}
      {error && <div>Error: {error}</div>}
      {transcript && <TranscriptView transcript={transcript} />}
      <button onClick={loadTranscript}>Load Transcript</button>
    </div>
  );
}
```

## Performance Tips

1. **Cache is your friend**: Don't use `forceRefresh` unless necessary
2. **Prefetch when possible**: Load transcripts in background
3. **Show progress**: Keep users informed during long operations
4. **Use retry logic**: Handle transient network failures
5. **Clean up cache**: Periodically clear expired entries

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| YouTube captions | ✅ | ✅ | ✅ | ✅ |
| Web Speech API | ✅ | ❌ | ✅ | ✅ |
| IndexedDB cache | ✅ | ✅ | ✅ | ✅ |

**Note**: Web Speech API is not supported in Firefox. Users on Firefox will only get YouTube captions.

## Troubleshooting

### Cache not working

- Check browser IndexedDB support
- Ensure storage quota not exceeded
- Check browser privacy settings

### Web Speech not working

- Verify browser support (Chrome, Safari, Edge)
- Check microphone permissions
- Ensure video has audio track
- Check video is not muted

### Slow performance

- Check network connection
- Consider prefetching transcripts
- Verify cache is working
- Check video availability

## Support

For issues or questions, please refer to the main documentation or create an issue in the repository.
