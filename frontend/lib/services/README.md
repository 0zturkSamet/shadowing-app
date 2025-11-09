# Web Speech Transcript Service

Browser-based real-time speech-to-text transcription service using the Web Speech API. This serves as a fallback when YouTube captions are unavailable.

## Features

- ✅ 100% client-side processing (no server required)
- ✅ Real-time transcription from video audio
- ✅ Sentence-level parsing with timestamps
- ✅ Progress tracking and error handling
- ✅ Multi-language support
- ✅ No API costs (uses browser's built-in speech recognition)

## Browser Support

- ✅ Chrome/Chromium (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ❌ Firefox (currently no Web Speech API support)

## Quick Start

### 1. Check Browser Support

```typescript
import { isWebSpeechSupported } from '@/lib/services/webSpeechTranscript';

if (!isWebSpeechSupported()) {
  alert('Your browser does not support Web Speech API');
}
```

### 2. Basic Usage with Video Element

```typescript
import {
  transcribeVideoWithWebSpeech,
  TranscriptionProgress,
} from '@/lib/services/webSpeechTranscript';

// Get your video element
const videoElement = document.querySelector('video') as HTMLVideoElement;

// Define progress callback
const handleProgress = (progress: TranscriptionProgress) => {
  console.log(progress.message);
  console.log(`${progress.percentage}%`);
};

// Start transcription
try {
  const sentences = await transcribeVideoWithWebSpeech(
    videoElement,
    {
      language: 'en-US',
      continuous: true,
      interimResults: true,
    },
    handleProgress
  );

  console.log(`Transcribed ${sentences.length} sentences:`, sentences);
} catch (error) {
  console.error('Transcription failed:', error);
}
```

### 3. Usage with Audio Blob

```typescript
import { transcribeAudioWithWebSpeech } from '@/lib/services/webSpeechTranscript';

// If you have an audio blob
const audioBlob = new Blob([audioData], { type: 'audio/wav' });

const sentences = await transcribeAudioWithWebSpeech(
  audioBlob,
  'en-US',
  (progress) => {
    console.log(progress.message);
  }
);
```

## React Hook Example

```typescript
import { useState, useCallback } from 'react';
import {
  transcribeVideoWithWebSpeech,
  TranscriptionProgress,
  WebSpeechError,
  getErrorMessage,
} from '@/lib/services/webSpeechTranscript';
import { TranscriptSentence } from '@/lib/types/transcript';

export function useWebSpeechTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentences, setSentences] = useState<TranscriptSentence[]>([]);

  const transcribe = useCallback(
    async (videoElement: HTMLVideoElement, language: string = 'en-US') => {
      setIsTranscribing(true);
      setError(null);
      setSentences([]);

      try {
        const result = await transcribeVideoWithWebSpeech(
          videoElement,
          { language },
          setProgress
        );

        setSentences(result);
        return result;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    []
  );

  return {
    transcribe,
    isTranscribing,
    progress,
    error,
    sentences,
  };
}
```

## Usage in Practice Page

```typescript
'use client';

import { useRef } from 'react';
import { useWebSpeechTranscription } from '@/lib/hooks/useWebSpeechTranscription';
import { isWebSpeechSupported } from '@/lib/services/webSpeechTranscript';

export default function PracticePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { transcribe, isTranscribing, progress, error } =
    useWebSpeechTranscription();

  const handleFallbackTranscribe = async () => {
    if (!isWebSpeechSupported()) {
      alert('Web Speech API not supported in your browser');
      return;
    }

    if (!videoRef.current) {
      alert('Video not loaded');
      return;
    }

    try {
      const sentences = await transcribe(videoRef.current, 'en-US');
      console.log('Transcription complete:', sentences);
      // Use sentences in your app
    } catch (err) {
      console.error('Transcription error:', err);
    }
  };

  return (
    <div>
      <video ref={videoRef} src="..." />

      <button onClick={handleFallbackTranscribe} disabled={isTranscribing}>
        {isTranscribing ? 'Transcribing...' : 'Transcribe with Web Speech'}
      </button>

      {progress && (
        <div>
          <p>{progress.message}</p>
          {progress.percentage && (
            <progress value={progress.percentage} max={100} />
          )}
          {progress.currentSentence && (
            <p>Sentences: {progress.currentSentence}</p>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Configuration Options

```typescript
interface WebSpeechConfig {
  language?: string; // Default: 'en-US'
  continuous?: boolean; // Default: true
  interimResults?: boolean; // Default: true
  maxAlternatives?: number; // Default: 1
}
```

## Supported Languages

- English: `en-US`, `en-GB`
- Spanish: `es-ES`, `es-MX`
- French: `fr-FR`
- German: `de-DE`
- Italian: `it-IT`
- Japanese: `ja-JP`
- Korean: `ko-KR`
- Portuguese: `pt-BR`, `pt-PT`
- Russian: `ru-RU`
- Chinese: `zh-CN`, `zh-TW`
- Arabic: `ar-SA`
- Hindi: `hi-IN`
- Dutch: `nl-NL`
- Polish: `pl-PL`
- Turkish: `tr-TR`

## Error Handling

```typescript
import { WebSpeechError, getErrorMessage } from '@/lib/services/webSpeechTranscript';

try {
  await transcribe(videoElement);
} catch (error) {
  if (error instanceof WebSpeechError) {
    switch (error.code) {
      case 'NOT_SUPPORTED':
        // Show message to use different browser
        break;
      case 'PERMISSION_DENIED':
        // Show message to enable microphone
        break;
      case 'NO_SPEECH':
        // Show message that no audio detected
        break;
      case 'NETWORK_ERROR':
        // Show message to check connection
        break;
      default:
        // Generic error message
        break;
    }
  }

  // Or use helper function
  const message = getErrorMessage(error);
  alert(message);
}
```

## Progress Tracking

```typescript
const handleProgress = (progress: TranscriptionProgress) => {
  switch (progress.status) {
    case 'extracting':
      console.log('Extracting audio...');
      break;
    case 'transcribing':
      console.log(`Transcribing... ${progress.currentSentence} sentences`);
      break;
    case 'completed':
      console.log('Transcription complete!');
      break;
    case 'error':
      console.error('Error:', progress.message);
      break;
  }
};
```

## Performance Considerations

- **Accuracy**: Web Speech typically provides 70-85% confidence, lower than YouTube or Assembly AI
- **Processing Time**: Real-time transcription (processes as video plays)
- **Resource Usage**: Moderate CPU/memory usage during transcription
- **Network**: No network required (100% offline after page load)
- **Best For**:
  - Fallback when YouTube captions unavailable
  - Quick transcription without API costs
  - Privacy-sensitive applications (no data sent to servers)

## Limitations

1. **Browser Support**: Only works in Chrome, Edge, and Safari
2. **Accuracy**: Lower accuracy than professional transcription services
3. **Background Noise**: Sensitive to background noise in video
4. **Language Detection**: No automatic language detection (must specify)
5. **Video Requirements**: Video must be playing for transcription to work

## Troubleshooting

### "Web Speech API is not supported"
- Use Chrome, Edge, or Safari
- Ensure you're not in private/incognito mode (some browsers restrict APIs)
- Check browser version is up-to-date

### "No speech detected"
- Ensure video has clear audio
- Check video volume is not muted
- Try increasing video volume
- Check for background noise

### "Permission denied"
- Browser may ask for microphone permission (even though we're transcribing video)
- Grant microphone access in browser settings
- Reload the page after granting permission

### Poor accuracy
- Use higher quality video sources
- Ensure clear audio without background music
- Try different language settings
- Consider using Assembly AI for better accuracy

## Integration with Existing Transcript Flow

```typescript
// In your practice page or component
async function fetchTranscriptWithFallback(videoId: string) {
  try {
    // Try YouTube/Assembly AI first
    const data = await fetchTranscript(videoId);
    return data;
  } catch (error) {
    console.warn('Primary transcription failed, using Web Speech fallback');

    // Fallback to Web Speech
    if (!isWebSpeechSupported()) {
      throw new Error('No transcription method available');
    }

    const videoElement = document.querySelector('video') as HTMLVideoElement;
    const sentences = await transcribeVideoWithWebSpeech(videoElement);

    return {
      video_id: videoId,
      transcript: sentences,
      status: 'completed',
      source: 'web_speech',
      cached: false,
      confidence: 0.75,
    };
  }
}
```

## License

Part of the Shadowing App project.
