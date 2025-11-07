import { useState, useEffect, useCallback, useRef } from 'react';
import { PhraseSchema, PracticeAttempt } from '@/types/video';
import { updateVideoProgress, recordPhraseAttempt } from '@/services/playerApi';

interface UseVideoPlayerOptions {
  videoId: string;
  phrases: PhraseSchema[];
  initialProgress?: number;
}

interface UseVideoPlayerReturn {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;

  // Practice mode
  practiceMode: boolean;
  practiceAttempts: Map<number, PracticeAttempt>;

  // Current phrase
  currentPhraseIndex: number;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePracticeMode: () => void;
  seekToPhrase: (index: number) => void;
  revealPhrase: (index: number) => void;
  recordAttempt: (phraseIndex: number, correct: boolean) => void;

  // Internal setters for player integration
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const useVideoPlayer = ({
  videoId,
  phrases,
  initialProgress = 0,
}: UseVideoPlayerOptions): UseVideoPlayerReturn => {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Practice mode state
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceAttempts, setPracticeAttempts] = useState<Map<number, PracticeAttempt>>(
    new Map()
  );

  // Current phrase tracking
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);

  // Refs for progress tracking
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);

  // Find current phrase based on time
  useEffect(() => {
    if (phrases.length === 0) return;

    const index = phrases.findIndex((phrase, idx) => {
      const nextPhrase = phrases[idx + 1];
      const phraseEnd = nextPhrase ? nextPhrase.start_time : duration;
      return currentTime >= phrase.start_time && currentTime < phraseEnd;
    });

    setCurrentPhraseIndex(index);
  }, [currentTime, phrases, duration]);

  // Update progress to backend every 10 seconds
  useEffect(() => {
    if (!isPlaying) return;

    progressTimerRef.current = setInterval(() => {
      const timeSinceLastUpdate = currentTime - lastProgressUpdateRef.current;

      if (timeSinceLastUpdate >= 10) {
        updateVideoProgress(videoId, currentTime, false).catch((error) => {
          console.error('Failed to update progress:', error);
        });
        lastProgressUpdateRef.current = currentTime;
      }
    }, 1000);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isPlaying, currentTime, videoId]);

  // Handle video completion
  useEffect(() => {
    if (duration > 0 && currentTime >= duration - 1) {
      updateVideoProgress(videoId, duration, true).catch((error) => {
        console.error('Failed to mark video as completed:', error);
      });
    }
  }, [currentTime, duration, videoId]);

  // Playback controls
  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const togglePracticeMode = useCallback(() => {
    setPracticeMode((prev) => !prev);
  }, []);

  // Seek to specific phrase
  const seekToPhrase = useCallback((index: number) => {
    if (index >= 0 && index < phrases.length) {
      const phrase = phrases[index];
      seek(phrase.start_time);
    }
  }, [phrases, seek]);

  // Reveal phrase in practice mode
  const revealPhrase = useCallback((index: number) => {
    setPracticeAttempts((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(index);

      if (existing) {
        newMap.set(index, {
          ...existing,
          revealed: true,
          attempts: existing.attempts + 1,
        });
      } else {
        newMap.set(index, {
          phrase_index: index,
          attempts: 1,
          revealed: true,
        });
      }

      return newMap;
    });
  }, []);

  // Record practice attempt
  const recordAttempt = useCallback(
    (phraseIndex: number, correct: boolean) => {
      setPracticeAttempts((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(phraseIndex);

        if (existing) {
          newMap.set(phraseIndex, {
            ...existing,
            attempts: existing.attempts + 1,
          });
        } else {
          newMap.set(phraseIndex, {
            phrase_index: phraseIndex,
            attempts: 1,
            revealed: false,
          });
        }

        return newMap;
      });

      // Send to backend
      recordPhraseAttempt(videoId, phraseIndex, correct).catch((error) => {
        console.error('Failed to record attempt:', error);
      });
    },
    [videoId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(currentTime + 5);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, seek, currentTime, toggleFullscreen, toggleMute]);

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    isFullscreen,
    practiceMode,
    practiceAttempts,
    currentPhraseIndex,

    // Actions
    play,
    pause,
    togglePlayPause,
    seek,
    setPlaybackSpeed,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePracticeMode,
    seekToPhrase,
    revealPhrase,
    recordAttempt,

    // Internal setters
    setIsPlaying,
    setCurrentTime,
    setDuration,
  };
};
