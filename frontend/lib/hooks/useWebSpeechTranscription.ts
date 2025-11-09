import { useState, useCallback, useRef } from 'react';
import {
  transcribeVideoWithWebSpeech,
  TranscriptionProgress,
  getErrorMessage,
  isWebSpeechSupported,
} from '@/lib/services/webSpeechTranscript';
import { TranscriptSentence } from '@/lib/types/transcript';

/**
 * React hook for Web Speech transcription
 * Provides easy integration with React components
 */
export function useWebSpeechTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentences, setSentences] = useState<TranscriptSentence[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  const recognitionRef = useRef<any>(null);

  /**
   * Check if browser supports Web Speech API
   */
  const isSupported = isWebSpeechSupported();

  /**
   * Start transcription from video element
   */
  const transcribe = useCallback(
    async (videoElement: HTMLVideoElement, language: string = 'en-US') => {
      if (!isSupported) {
        const errorMsg =
          'Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setIsTranscribing(true);
      setError(null);
      setSentences([]);
      setProgress(null);
      setStartTime(Date.now());

      try {
        const result = await transcribeVideoWithWebSpeech(
          videoElement,
          { language },
          (progressUpdate) => {
            setProgress(progressUpdate);
          }
        );

        setSentences(result);
        setEndTime(Date.now());

        console.log(
          `[useWebSpeechTranscription] Completed: ${result.length} sentences in ${((Date.now() - startTime) / 1000).toFixed(1)}s`
        );

        return result;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        setEndTime(Date.now());
        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    [isSupported, startTime]
  );

  /**
   * Cancel ongoing transcription
   */
  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('[useWebSpeechTranscription] Transcription cancelled');
      } catch (err) {
        console.error('[useWebSpeechTranscription] Error cancelling:', err);
      }
    }
    setIsTranscribing(false);
    setProgress(null);
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setIsTranscribing(false);
    setProgress(null);
    setError(null);
    setSentences([]);
    setStartTime(0);
    setEndTime(0);
  }, []);

  /**
   * Get processing time in seconds
   */
  const getProcessingTime = useCallback(() => {
    if (startTime === 0) return 0;
    const end = endTime || Date.now();
    return (end - startTime) / 1000;
  }, [startTime, endTime]);

  return {
    // State
    isTranscribing,
    progress,
    error,
    sentences,
    isSupported,

    // Actions
    transcribe,
    cancel,
    reset,

    // Utilities
    getProcessingTime,
  };
}
