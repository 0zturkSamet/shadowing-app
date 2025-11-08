import { useState, useEffect, useCallback, RefObject } from "react";
import { TranscriptSentence, PracticeState } from "@/lib/types/transcript";

/**
 * Find current sentence index based on video time
 * Uses binary search for efficiency
 */
function getCurrentSentenceIndex(
  currentTime: number,
  sentences: TranscriptSentence[]
): number {
  if (sentences.length === 0) return 0;

  let left = 0;
  let right = sentences.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const sentence = sentences[mid];

    if (currentTime >= sentence.start_time && currentTime < sentence.end_time) {
      return mid;
    } else if (currentTime < sentence.start_time) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return Math.max(0, Math.min(left - 1, sentences.length - 1));
}

interface UseVideoSyncReturn {
  state: PracticeState;
  jumpToTime: (time: number) => void;
  nextSentence: () => void;
  previousSentence: () => void;
  toggleLoopSentence: () => void;
  markSentenceComplete: (sentenceId: number) => void;
}

export function useVideoSync(
  sentences: TranscriptSentence[],
  videoRef: RefObject<HTMLVideoElement>
): UseVideoSyncReturn {
  const [state, setState] = useState<PracticeState>({
    currentSentenceIndex: 0,
    isPlaying: false,
    isLooping: false,
    loopCount: 0,
    completedSentences: new Set(),
    currentTime: 0,
    duration: 0,
  });

  // Update current time from video element
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const index = getCurrentSentenceIndex(videoElement.currentTime, sentences);
      setState((prev) => ({
        ...prev,
        currentSentenceIndex: index,
        currentTime: videoElement.currentTime,
      }));

      // Handle looping
      if (state.isLooping && index !== state.currentSentenceIndex) {
        const currentSentence = sentences[state.currentSentenceIndex];
        if (currentSentence && videoElement.currentTime >= currentSentence.end_time) {
          videoElement.currentTime = currentSentence.start_time;
          setState((prev) => ({
            ...prev,
            loopCount: prev.loopCount + 1,
          }));

          // Stop looping after 3x
          if (state.loopCount >= 2) {
            setState((prev) => ({
              ...prev,
              isLooping: false,
              loopCount: 0,
            }));
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: videoElement.duration,
      }));
    };

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("play", handlePlay);
    videoElement.addEventListener("pause", handlePause);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("play", handlePlay);
      videoElement.removeEventListener("pause", handlePause);
    };
  }, [videoRef, sentences, state.isLooping, state.currentSentenceIndex, state.loopCount]);

  const jumpToTime = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    [videoRef]
  );

  const nextSentence = useCallback(() => {
    if (state.currentSentenceIndex < sentences.length - 1) {
      const nextTime = sentences[state.currentSentenceIndex + 1].start_time;
      jumpToTime(nextTime);
    }
  }, [state.currentSentenceIndex, sentences, jumpToTime]);

  const previousSentence = useCallback(() => {
    if (state.currentSentenceIndex > 0) {
      const prevTime = sentences[state.currentSentenceIndex - 1].start_time;
      jumpToTime(prevTime);
    }
  }, [state.currentSentenceIndex, sentences, jumpToTime]);

  const toggleLoopSentence = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLooping: !prev.isLooping,
      loopCount: 0,
    }));
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
