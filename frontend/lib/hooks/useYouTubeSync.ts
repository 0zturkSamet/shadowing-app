import { useState, useEffect, useCallback, RefObject } from "react";
import { TranscriptSentence, PracticeState } from "@/lib/types/transcript";

/**
 * Find current sentence index based on video time
 */
function getCurrentSentenceIndex(
  currentTime: number,
  sentences: TranscriptSentence[]
): number {
  if (sentences.length === 0) return 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (currentTime >= sentence.start_time && currentTime < sentence.end_time) {
      return i;
    }
  }

  // If not in any sentence, find the closest one
  return Math.max(0, Math.min(sentences.length - 1,
    sentences.findIndex(s => currentTime < s.start_time) - 1));
}

interface UseYouTubeSyncReturn {
  state: PracticeState;
  jumpToTime: (time: number) => void;
  nextSentence: () => void;
  previousSentence: () => void;
  toggleLoopSentence: () => void;
  markSentenceComplete: (sentenceId: number) => void;
}

export function useYouTubeSync(
  sentences: TranscriptSentence[],
  playerRef: RefObject<any>,
  playerReady: boolean = false
): UseYouTubeSyncReturn {
  const [state, setState] = useState<PracticeState>({
    currentSentenceIndex: 0,
    isPlaying: false,
    isLooping: false,
    loopCount: 0,
    completedSentences: new Set(),
    currentTime: 0,
    duration: 0,
  });

  // Poll YouTube player for time updates
  useEffect(() => {
    if (!playerReady || !playerRef.current || sentences.length === 0) {
      console.log('[useYouTubeSync] Not ready - playerReady:', playerReady, 'player:', !!playerRef.current, 'sentences:', sentences.length);
      return;
    }

    console.log('[useYouTubeSync] Starting polling interval - player is ready!');

    const interval = setInterval(() => {
      try {
        const player = playerRef.current;
        if (!player || !player.getCurrentTime) return;

        const currentTime = player.getCurrentTime();
        const playerState = player.getPlayerState();
        const isPlaying = playerState === 1; // 1 = playing
        const duration = player.getDuration() || 0;

        const index = getCurrentSentenceIndex(currentTime, sentences);

        setState((prev) => {
          // Handle looping
          if (prev.isLooping && index === prev.currentSentenceIndex) {
            const currentSentence = sentences[prev.currentSentenceIndex];
            if (currentSentence && currentTime >= currentSentence.end_time - 0.1) {
              player.seekTo(currentSentence.start_time, true);

              const newLoopCount = prev.loopCount + 1;

              // Stop looping after 3 times
              if (newLoopCount >= 3) {
                return {
                  ...prev,
                  currentSentenceIndex: index,
                  currentTime,
                  duration,
                  isPlaying,
                  isLooping: false,
                  loopCount: 0,
                };
              }

              return {
                ...prev,
                currentSentenceIndex: index,
                currentTime,
                duration,
                isPlaying,
                loopCount: newLoopCount,
              };
            }
          }

          // Normal update
          return {
            ...prev,
            currentSentenceIndex: index,
            currentTime,
            duration,
            isPlaying,
          };
        });
      } catch (error) {
        console.error("Error polling YouTube player:", error);
      }
    }, 100); // Poll every 100ms

    return () => {
      console.log('[useYouTubeSync] Cleaning up polling interval');
      clearInterval(interval);
    };
  }, [playerReady, playerRef, sentences]);

  const jumpToTime = useCallback(
    (time: number) => {
      console.log('[useYouTubeSync] jumpToTime called with:', time);
      console.log('[useYouTubeSync] playerRef.current:', playerRef.current);
      console.log('[useYouTubeSync] Has seekTo?', !!playerRef.current?.seekTo);

      if (playerRef.current && playerRef.current.seekTo) {
        console.log('[useYouTubeSync] Seeking to:', time);
        playerRef.current.seekTo(time, true);
      } else {
        console.error('[useYouTubeSync] Cannot seek - player not ready');
      }
    },
    [playerRef]
  );

  const nextSentence = useCallback(() => {
    console.log('[useYouTubeSync] nextSentence called');
    if (state.currentSentenceIndex < sentences.length - 1) {
      const nextTime = sentences[state.currentSentenceIndex + 1].start_time;
      console.log('[useYouTubeSync] Next sentence time:', nextTime);
      jumpToTime(nextTime);
    } else {
      console.log('[useYouTubeSync] Already at last sentence');
    }
  }, [state.currentSentenceIndex, sentences, jumpToTime]);

  const previousSentence = useCallback(() => {
    console.log('[useYouTubeSync] previousSentence called');
    if (state.currentSentenceIndex > 0) {
      const prevTime = sentences[state.currentSentenceIndex - 1].start_time;
      console.log('[useYouTubeSync] Previous sentence time:', prevTime);
      jumpToTime(prevTime);
    } else {
      console.log('[useYouTubeSync] Already at first sentence');
    }
  }, [state.currentSentenceIndex, sentences, jumpToTime]);

  const toggleLoopSentence = useCallback(() => {
    console.log('[useYouTubeSync] toggleLoopSentence called');
    setState((prev) => {
      console.log('[useYouTubeSync] Loop state changing from', prev.isLooping, 'to', !prev.isLooping);
      return {
        ...prev,
        isLooping: !prev.isLooping,
        loopCount: 0,
      };
    });
  }, []);

  const markSentenceComplete = useCallback((sentenceId: number) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedSentences);
      if (newCompleted.has(sentenceId)) {
        newCompleted.delete(sentenceId);
      } else {
        newCompleted.add(sentenceId);
      }
      return {
        ...prev,
        completedSentences: newCompleted,
      };
    });
  }, []);

  return {
    state,
    jumpToTime,
    nextSentence,
    previousSentence,
    toggleLoopSentence,
    markSentenceComplete,
  };
}
