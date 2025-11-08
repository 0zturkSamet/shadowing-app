# ShadowSpeak Practice Page - Completion Guide
## From 60% → 100% Complete

**Current Status:** Foundation built, needs feature integration
**Estimated Time:** 8-14 hours (depending on voice recording)
**Difficulty:** Medium (most components already exist!)

---

## 🎯 What's Already Done (60%)

✅ **Backend (100% Complete)**
- Assembly AI integration with YouTube fallback
- Smart transcript endpoint (`/api/videos/{id}/smart-transcript`)
- Redis + PostgreSQL caching
- Progress tracking API
- Practice attempt recording API

✅ **Frontend Core (40% Complete)**
- Practice page layout (2-column)
- Video player (YouTube IFrame API)
- Transcript viewer with highlighting
- Click-to-seek functionality
- Authentication flow

✅ **Built But Not Integrated (20%)**
- `PlayerControls` component - Full video controls ready
- `useVideoPlayer` hook - Comprehensive state management
- `PracticeMode` component - Statistics panel
- API modules - Progress tracking ready
- Keyboard shortcuts - Built into useVideoPlayer hook

---

## 🚀 Phase 1: Quick Wins (1.5 hours)

### Goal: Integrate existing components for instant 80% completion

### Step 1.1: Add Player Controls (15 minutes)

**File:** `/frontend/app/practice/[id]/page.tsx`

**Current code:**
```tsx
<div className="col-span-3">
  <VideoPlayer
    videoId={videoId}
    onTimeUpdate={setCurrentTime}
  />
  {/* No controls visible */}
</div>
```

**Update to:**
```tsx
import { PlayerControls } from '@/components/PlayerControls';

// Inside component:
const [isPlaying, setIsPlaying] = useState(false);
const [volume, setVolume] = useState(1);
const [speed, setSpeed] = useState(1);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const videoRef = useRef<any>(null);

// In JSX:
<div className="col-span-3 space-y-4">
  <VideoPlayer
    ref={videoRef}
    videoId={videoId}
    onTimeUpdate={setCurrentTime}
    onDurationChange={setDuration}
    isPlaying={isPlaying}
    volume={volume}
    speed={speed}
  />

  <PlayerControls
    isPlaying={isPlaying}
    onPlayPause={() => setIsPlaying(!isPlaying)}
    currentTime={currentTime}
    duration={duration}
    onSeek={(time) => videoRef.current?.seekTo(time)}
    volume={volume}
    onVolumeChange={setVolume}
    speed={speed}
    onSpeedChange={setSpeed}
    isPracticeMode={isPracticeMode}
    onPracticeModeToggle={() => setIsPracticeMode(!isPracticeMode)}
  />
</div>
```

**Result:** ✅ Full video controls (play, pause, seek, volume, speed, fullscreen)

---

### Step 1.2: Use useVideoPlayer Hook (30 minutes)

**Current code:** Manual state management with multiple `useState` calls

**Replace with:**
```tsx
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

export default function PracticePage() {
  const params = useParams();
  const videoId = parseInt(params.id as string);

  // Fetch transcript (keep existing code)
  const { data: transcriptData, isLoading, error } = useFetch(...);

  // Replace all manual state with this hook
  const {
    // Playback state
    isPlaying,
    currentTime,
    duration,
    volume,
    speed,
    isMuted,
    isFullscreen,

    // Practice state
    isPracticeMode,
    currentPhrase,
    revealedPhrases,
    practiceAttempts,
    completionRate,

    // Handlers
    handlePlayPause,
    handleSeek,
    handleVolumeChange,
    handleSpeedChange,
    handleMuteToggle,
    handleFullscreenToggle,
    handlePracticeModeToggle,
    handlePhraseReveal,
    handlePhraseAttempt,

    // Refs
    videoRef,
  } = useVideoPlayer(
    videoId,
    transcriptData?.phrases || [],
    {
      autoSaveProgress: true, // Auto-saves every 10 seconds
      enableKeyboardShortcuts: true, // Space, arrows, F, M
    }
  );

  // Now use these values instead of manual state
  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-3">
        <VideoPlayer
          ref={videoRef}
          videoId={transcriptData?.video_id}
          // Props are handled by the hook
        />

        <PlayerControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreenToggle}
          isPracticeMode={isPracticeMode}
          onPracticeModeToggle={handlePracticeModeToggle}
        />
      </div>

      <div className="col-span-2">
        <TranscriptViewer
          phrases={transcriptData?.phrases || []}
          currentTime={currentTime}
          onPhraseClick={(phrase) => handleSeek(phrase.start_time)}
          isPracticeMode={isPracticeMode}
          revealedPhrases={revealedPhrases}
          onPhraseReveal={handlePhraseReveal}
        />
      </div>
    </div>
  );
}
```

**Result:**
- ✅ Automatic progress tracking (saves every 10s)
- ✅ Keyboard shortcuts working (Space, arrows, F, M)
- ✅ Practice statistics tracked
- ✅ Resume from last position
- ✅ Completion detection

---

### Step 1.3: Add Practice Statistics Panel (15 minutes)

**Add below TranscriptViewer:**

```tsx
import { PracticeMode } from '@/components/PracticeMode';

<div className="col-span-2 space-y-4">
  <TranscriptViewer
    phrases={transcriptData?.phrases || []}
    currentTime={currentTime}
    onPhraseClick={(phrase) => handleSeek(phrase.start_time)}
    isPracticeMode={isPracticeMode}
    revealedPhrases={revealedPhrases}
    onPhraseReveal={handlePhraseReveal}
  />

  {isPracticeMode && (
    <PracticeMode
      revealedCount={revealedPhrases.size}
      totalCount={transcriptData?.phrases.length || 0}
      attempts={practiceAttempts}
      completionRate={completionRate}
      currentPhrase={currentPhrase}
    />
  )}
</div>
```

**Result:**
- ✅ Live practice statistics
- ✅ Revealed phrase counter
- ✅ Completion rate
- ✅ Practice tips

---

### Step 1.4: Update VideoPlayer Component (15 minutes)

**File:** `/frontend/components/VideoPlayer.tsx`

**Add ref forwarding to expose YouTube player methods:**

```tsx
import { forwardRef, useImperativeHandle } from 'react';

interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  setPlaybackRate: (speed: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoId, onTimeUpdate, onDurationChange, isPlaying, volume, speed }, ref) => {
    const playerRef = useRef<any>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds);
      },
      play: () => {
        playerRef.current?.playVideo();
      },
      pause: () => {
        playerRef.current?.pauseVideo();
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime() || 0;
      },
      getDuration: () => {
        return playerRef.current?.getDuration() || 0;
      },
      setVolume: (vol: number) => {
        playerRef.current?.setVolume(vol * 100);
      },
      setPlaybackRate: (rate: number) => {
        playerRef.current?.setPlaybackRate(rate);
      },
    }));

    // Handle isPlaying prop changes
    useEffect(() => {
      if (!playerRef.current) return;

      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }, [isPlaying]);

    // Handle volume prop changes
    useEffect(() => {
      if (!playerRef.current) return;
      playerRef.current.setVolume(volume * 100);
    }, [volume]);

    // Handle speed prop changes
    useEffect(() => {
      if (!playerRef.current) return;
      playerRef.current.setPlaybackRate(speed);
    }, [speed]);

    // ... rest of component
  }
);
```

**Result:** ✅ Parent components can control video playback programmatically

---

### Step 1.5: Add Keyboard Shortcut Help Modal (15 minutes)

**File:** `/frontend/components/KeyboardShortcutsHelp.tsx` (create new)

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition"
      >
        ⌨️ Shortcuts (?)
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <ShortcutRow shortcut="Space" description="Play / Pause" />
          <ShortcutRow shortcut="←" description="Rewind 5 seconds" />
          <ShortcutRow shortcut="→" description="Forward 5 seconds" />
          <ShortcutRow shortcut="F" description="Toggle fullscreen" />
          <ShortcutRow shortcut="M" description="Toggle mute" />
          <ShortcutRow shortcut="N" description="Next phrase (coming soon)" />
          <ShortcutRow shortcut="P" description="Previous phrase (coming soon)" />
          <ShortcutRow shortcut="L" description="Loop phrase (coming soon)" />
          <ShortcutRow shortcut="R" description="Record (coming soon)" />
          <ShortcutRow shortcut="?" description="Show this help" />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Press <kbd className="bg-gray-700 px-2 py-1 rounded">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <kbd className="bg-gray-700 text-white px-3 py-1 rounded font-mono text-sm min-w-[60px] text-center">
        {shortcut}
      </kbd>
      <span className="text-gray-300 text-sm">{description}</span>
    </div>
  );
}
```

**Add to practice page:**
```tsx
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

// At the end of the page:
<KeyboardShortcutsHelp />
```

**Result:** ✅ Users can press `?` to see available shortcuts

---

## ✅ Phase 1 Complete! (1.5 hours)

**You now have:**
- ✅ Full video controls (play, pause, seek, volume, speed)
- ✅ Automatic progress tracking
- ✅ Keyboard shortcuts working
- ✅ Practice statistics display
- ✅ Help modal for shortcuts
- ✅ Resume from last position
- ✅ Professional UI matching design guide

**Completion: 40% → 80%** 🎉

---

## 🎮 Phase 2: Shadowing Controls (3-4 hours)

### Goal: Add Next/Previous/Loop phrase controls

### Step 2.1: Create Phrase Navigation Logic (1 hour)

**File:** `/frontend/hooks/usePhraseNavigation.ts` (create new)

```tsx
import { useState, useCallback, useEffect } from 'react';
import { Phrase } from '@/types/video';

interface UsePhraseNavigationProps {
  phrases: Phrase[];
  currentTime: number;
  onSeek: (time: number) => void;
  onPause: () => void;
  onPlay: () => void;
}

export function usePhraseNavigation({
  phrases,
  currentTime,
  onSeek,
  onPause,
  onPlay,
}: UsePhraseNavigationProps) {
  const [isLooping, setIsLooping] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Find current phrase index based on time
  useEffect(() => {
    const index = phrases.findIndex(
      (phrase) =>
        currentTime >= phrase.start_time &&
        currentTime < phrase.start_time + phrase.duration
    );
    if (index !== -1) {
      setCurrentPhraseIndex(index);
    }
  }, [currentTime, phrases]);

  // Handle looping
  useEffect(() => {
    if (!isLooping || loopCount >= 3) return;

    const currentPhrase = phrases[currentPhraseIndex];
    if (!currentPhrase) return;

    const endTime = currentPhrase.start_time + currentPhrase.duration;

    // If we've passed the end of the phrase, loop back
    if (currentTime >= endTime) {
      onSeek(currentPhrase.start_time);
      setLoopCount((prev) => prev + 1);

      // Stop looping after 3 times
      if (loopCount + 1 >= 3) {
        setIsLooping(false);
        setLoopCount(0);
      }
    }
  }, [currentTime, isLooping, loopCount, currentPhraseIndex, phrases, onSeek]);

  const nextPhrase = useCallback(() => {
    if (currentPhraseIndex < phrases.length - 1) {
      const nextPhrase = phrases[currentPhraseIndex + 1];
      onSeek(nextPhrase.start_time);
      onPlay();
    }
  }, [currentPhraseIndex, phrases, onSeek, onPlay]);

  const previousPhrase = useCallback(() => {
    if (currentPhraseIndex > 0) {
      const prevPhrase = phrases[currentPhraseIndex - 1];
      onSeek(prevPhrase.start_time);
      onPlay();
    }
  }, [currentPhraseIndex, phrases, onSeek, onPlay]);

  const toggleLoop = useCallback(() => {
    if (isLooping) {
      // Stop looping
      setIsLooping(false);
      setLoopCount(0);
    } else {
      // Start looping current phrase
      setIsLooping(true);
      setLoopCount(0);
      const currentPhrase = phrases[currentPhraseIndex];
      if (currentPhrase) {
        onSeek(currentPhrase.start_time);
        onPlay();
      }
    }
  }, [isLooping, currentPhraseIndex, phrases, onSeek, onPlay]);

  const skipToPhrase = useCallback(
    (phraseIndex: number) => {
      if (phraseIndex >= 0 && phraseIndex < phrases.length) {
        const phrase = phrases[phraseIndex];
        onSeek(phrase.start_time);
        setCurrentPhraseIndex(phraseIndex);
      }
    },
    [phrases, onSeek]
  );

  return {
    currentPhraseIndex,
    currentPhrase: phrases[currentPhraseIndex],
    isLooping,
    loopCount,
    nextPhrase,
    previousPhrase,
    toggleLoop,
    skipToPhrase,
    hasNext: currentPhraseIndex < phrases.length - 1,
    hasPrevious: currentPhraseIndex > 0,
  };
}
```

---

### Step 2.2: Create Shadowing Controls Component (1 hour)

**File:** `/frontend/components/ShadowingControls.tsx` (create new)

```tsx
"use client";

import React from 'react';
import {
  SkipBack,
  SkipForward,
  RotateCw,
  Mic,
  BarChart3,
  Play,
  Pause,
} from 'lucide-react';

interface ShadowingControlsProps {
  // Navigation
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;

  // Playback
  isPlaying: boolean;
  onPlayPause: () => void;

  // Looping
  isLooping: boolean;
  loopCount: number;
  onToggleLoop: () => void;

  // Recording
  isRecording: boolean;
  onRecord: () => void;

  // Stats
  completedCount: number;
  totalCount: number;
  onShowProgress: () => void;

  // Current phrase
  currentPhraseIndex: number;
}

export function ShadowingControls({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  isPlaying,
  onPlayPause,
  isLooping,
  loopCount,
  onToggleLoop,
  isRecording,
  onRecord,
  completedCount,
  totalCount,
  onShowProgress,
  currentPhraseIndex,
}: ShadowingControlsProps) {
  const completionRate = Math.round((completedCount / totalCount) * 100) || 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      {/* Main Controls Row */}
      <div className="flex items-center justify-between mb-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="p-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition"
            title="Previous Phrase (P)"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={onPlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="p-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition"
            title="Next Phrase (N)"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Feature Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleLoop}
            className={`
              px-4 py-2 rounded-lg font-medium transition flex items-center gap-2
              ${
                isLooping
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }
            `}
            title="Loop Current Phrase (L)"
          >
            <RotateCw className={`w-4 h-4 ${isLooping ? 'animate-spin' : ''}`} />
            <span>Loop {isLooping ? `(${loopCount}/3)` : ''}</span>
          </button>

          <button
            onClick={onRecord}
            className={`
              px-4 py-2 rounded-lg font-medium transition flex items-center gap-2
              ${
                isRecording
                  ? 'bg-red-700 hover:bg-red-800 text-white animate-pulse'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }
            `}
            title="Record Your Voice (R)"
          >
            <Mic className="w-4 h-4" />
            <span>{isRecording ? 'Recording...' : 'Record'}</span>
          </button>

          <button
            onClick={onShowProgress}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition flex items-center gap-2"
            title="View Progress Statistics"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Progress</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 text-center pt-4 border-t border-gray-800">
        <div>
          <p className="text-lg font-bold text-white">
            {currentPhraseIndex + 1} / {totalCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Current Phrase</p>
        </div>

        <div>
          <p className="text-lg font-bold text-white">
            {completedCount} / {totalCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Completed</p>
        </div>

        <div>
          <p className="text-lg font-bold text-white">{completionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Progress</p>
        </div>

        <div>
          <p className="text-lg font-bold text-white">
            {isLooping ? loopCount + '/3' : '-'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Loop Count</p>
        </div>
      </div>

      {/* Loop Indicator */}
      {isLooping && (
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-yellow-300 text-sm text-center">
            🔄 Looping phrase {loopCount + 1}/3 - Will auto-stop after 3 repetitions
          </p>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 mb-2">Quick shortcuts:</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">Space</kbd>{' '}
            Play/Pause
          </div>
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">N</kbd> Next
          </div>
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">P</kbd>{' '}
            Previous
          </div>
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">L</kbd> Loop
          </div>
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">R</kbd> Record
          </div>
          <div>
            <kbd className="bg-gray-800 px-2 py-1 rounded font-mono">?</kbd> Help
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 2.3: Integrate into Practice Page (30 minutes)

**File:** `/frontend/app/practice/[id]/page.tsx`

**Add:**

```tsx
import { usePhraseNavigation } from '@/hooks/usePhraseNavigation';
import { ShadowingControls } from '@/components/ShadowingControls';

export default function PracticePage() {
  // ... existing code ...

  const {
    handlePlayPause,
    handleSeek,
    // ... other handlers from useVideoPlayer
  } = useVideoPlayer(...);

  // Add phrase navigation
  const {
    currentPhraseIndex,
    currentPhrase,
    isLooping,
    loopCount,
    nextPhrase,
    previousPhrase,
    toggleLoop,
    hasNext,
    hasPrevious,
  } = usePhraseNavigation({
    phrases: transcriptData?.phrases || [],
    currentTime,
    onSeek: handleSeek,
    onPause: () => handlePlayPause(), // if isPlaying
    onPlay: () => handlePlayPause(), // if !isPlaying
  });

  // Recording state (placeholder for Phase 3)
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="space-y-6">
      {/* Existing video + transcript grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* ... */}
      </div>

      {/* NEW: Shadowing Controls */}
      <ShadowingControls
        onPrevious={previousPhrase}
        onNext={nextPhrase}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        isLooping={isLooping}
        loopCount={loopCount}
        onToggleLoop={toggleLoop}
        isRecording={isRecording}
        onRecord={() => setIsRecording(!isRecording)}
        completedCount={revealedPhrases.size}
        totalCount={transcriptData?.phrases.length || 0}
        onShowProgress={() => {
          // TODO: Open stats modal
          console.log('Show progress modal');
        }}
        currentPhraseIndex={currentPhraseIndex}
      />
    </div>
  );
}
```

---

### Step 2.4: Add Keyboard Shortcuts for Navigation (30 minutes)

**File:** `/frontend/hooks/useVideoPlayer.ts`

**Update the keyboard shortcuts handler to include:**

```tsx
// Inside useVideoPlayer hook:

useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Don't trigger if typing in input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        handlePlayPause();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
        break;

      case 'ArrowRight':
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
        break;

      case 'KeyF':
        e.preventDefault();
        handleFullscreenToggle();
        break;

      case 'KeyM':
        e.preventDefault();
        handleMuteToggle();
        break;

      // NEW SHORTCUTS:
      case 'KeyN':
        e.preventDefault();
        // Call nextPhrase from usePhraseNavigation
        onNextPhrase?.();
        break;

      case 'KeyP':
        e.preventDefault();
        // Call previousPhrase from usePhraseNavigation
        onPreviousPhrase?.();
        break;

      case 'KeyL':
        e.preventDefault();
        // Call toggleLoop from usePhraseNavigation
        onToggleLoop?.();
        break;

      case 'KeyR':
        e.preventDefault();
        // Call record handler
        onRecord?.();
        break;

      default:
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [
  currentTime,
  duration,
  handlePlayPause,
  handleSeek,
  handleFullscreenToggle,
  handleMuteToggle,
  // ... add callbacks
]);
```

**Update useVideoPlayer to accept optional callbacks:**

```tsx
export function useVideoPlayer(
  videoId: number,
  phrases: Phrase[],
  options?: {
    autoSaveProgress?: boolean;
    enableKeyboardShortcuts?: boolean;
    onNextPhrase?: () => void;
    onPreviousPhrase?: () => void;
    onToggleLoop?: () => void;
    onRecord?: () => void;
  }
) {
  // ... implementation
}
```

---

### Step 2.5: Test Shadowing Workflow (30 minutes)

**Test checklist:**

1. **Navigation:**
   - [ ] Click "Next" → jumps to next phrase
   - [ ] Click "Previous" → jumps to previous phrase
   - [ ] Press N → same as Next button
   - [ ] Press P → same as Previous button

2. **Looping:**
   - [ ] Click "Loop" → phrase repeats
   - [ ] Loop counter shows (1/3), (2/3), (3/3)
   - [ ] After 3 loops, looping stops automatically
   - [ ] Press L → toggles loop on/off

3. **Stats:**
   - [ ] Current phrase counter updates
   - [ ] Completed count accurate
   - [ ] Progress percentage correct
   - [ ] Loop count displays when looping

4. **Edge cases:**
   - [ ] "Previous" disabled on first phrase
   - [ ] "Next" disabled on last phrase
   - [ ] Loop works across phrase boundaries
   - [ ] Stats update in real-time

---

## ✅ Phase 2 Complete! (3-4 hours)

**You now have:**
- ✅ Next/Previous phrase navigation
- ✅ Loop phrase functionality (3x auto-stop)
- ✅ Keyboard shortcuts (N, P, L)
- ✅ Real-time statistics
- ✅ Professional shadowing controls
- ✅ Record button (placeholder)

**Completion: 80% → 90%** 🎉

---

## 🎙️ Phase 3: Voice Recording (4-6 hours) - OPTIONAL

### Goal: Allow users to record themselves and compare

### Step 3.1: Create Recording Hook (2 hours)

**File:** `/frontend/hooks/useVoiceRecording.ts` (create new)

```tsx
import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  recordingUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // When recording stops, create URL
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access microphone'
      );
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }
    chunksRef.current = [];
  }, [recordingUrl]);

  return {
    isRecording,
    recordingUrl,
    startRecording,
    stopRecording,
    clearRecording,
    error,
  };
}
```

---

### Step 3.2: Create Recording Comparison Component (2 hours)

**File:** `/frontend/components/RecordingComparison.tsx` (create new)

```tsx
"use client";

import React, { useRef, useState } from 'react';
import { Play, Pause, X, Download, RotateCcw } from 'lucide-react';
import { Phrase } from '@/types/video';

interface RecordingComparisonProps {
  phrase: Phrase;
  recordingUrl: string;
  videoAudioUrl?: string; // Optional: could extract from video
  onClose: () => void;
  onRetry: () => void;
}

export function RecordingComparison({
  phrase,
  recordingUrl,
  videoAudioUrl,
  onClose,
  onRetry,
}: RecordingComparisonProps) {
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const recordingAudioRef = useRef<HTMLAudioElement>(null);

  const playOriginal = () => {
    if (originalAudioRef.current) {
      originalAudioRef.current.play();
      setIsPlayingOriginal(true);
    }
  };

  const pauseOriginal = () => {
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      setIsPlayingOriginal(false);
    }
  };

  const playRecording = () => {
    if (recordingAudioRef.current) {
      recordingAudioRef.current.play();
      setIsPlayingRecording(true);
    }
  };

  const pauseRecording = () => {
    if (recordingAudioRef.current) {
      recordingAudioRef.current.pause();
      setIsPlayingRecording(false);
    }
  };

  const downloadRecording = () => {
    const a = document.createElement('a');
    a.href = recordingUrl;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Compare Your Recording
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Phrase Text */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Phrase practiced:</p>
          <p className="text-white text-lg">{phrase.text}</p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Original Audio */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Original Audio
            </h3>

            {videoAudioUrl && (
              <>
                <audio
                  ref={originalAudioRef}
                  src={videoAudioUrl}
                  onEnded={() => setIsPlayingOriginal(false)}
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={
                      isPlayingOriginal ? pauseOriginal : playOriginal
                    }
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition"
                  >
                    {isPlayingOriginal ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white" />
                    )}
                  </button>

                  <div className="flex-1 h-1 bg-gray-700 rounded">
                    {/* Could add waveform visualization here */}
                  </div>
                </div>
              </>
            )}

            {!videoAudioUrl && (
              <p className="text-gray-500 text-sm">
                Original audio not available
              </p>
            )}
          </div>

          {/* Your Recording */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Your Recording
            </h3>

            <audio
              ref={recordingAudioRef}
              src={recordingUrl}
              onEnded={() => setIsPlayingRecording(false)}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={
                  isPlayingRecording ? pauseRecording : playRecording
                }
                className="p-3 bg-green-600 hover:bg-green-700 rounded-full transition"
              >
                {isPlayingRecording ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white" />
                )}
              </button>

              <div className="flex-1 h-1 bg-gray-700 rounded">
                {/* Could add waveform visualization here */}
              </div>

              <button
                onClick={downloadRecording}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                title="Download recording"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Record Again
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Continue Practicing
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 <strong>Tip:</strong> Listen carefully to the pronunciation,
            intonation, and rhythm. Practice makes perfect!
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 3.3: Integrate Recording into Practice Page (1 hour)

**File:** `/frontend/app/practice/[id]/page.tsx`

```tsx
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { RecordingComparison } from '@/components/RecordingComparison';

export default function PracticePage() {
  // ... existing code ...

  const {
    isRecording,
    recordingUrl,
    startRecording,
    stopRecording,
    clearRecording,
    error: recordingError,
  } = useVoiceRecording();

  const [showRecordingComparison, setShowRecordingComparison] =
    useState(false);

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      stopRecording();
      // Show comparison modal
      setShowRecordingComparison(true);
    } else {
      // Start recording
      await startRecording();
      // Auto-pause video during recording
      if (isPlaying) {
        handlePlayPause();
      }
    }
  };

  const handleRecordingRetry = () => {
    clearRecording();
    setShowRecordingComparison(false);
    handleRecord(); // Start new recording
  };

  return (
    <>
      {/* Existing layout */}
      <div className="space-y-6">
        {/* ... video + transcript ... */}

        <ShadowingControls
          {/* ... other props ... */}
          isRecording={isRecording}
          onRecord={handleRecord}
        />
      </div>

      {/* Recording Comparison Modal */}
      {showRecordingComparison && recordingUrl && (
        <RecordingComparison
          phrase={currentPhrase}
          recordingUrl={recordingUrl}
          onClose={() => {
            setShowRecordingComparison(false);
            clearRecording();
          }}
          onRetry={handleRecordingRetry}
        />
      )}

      {/* Recording Error */}
      {recordingError && (
        <div className="fixed bottom-4 left-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <p className="text-sm">❌ {recordingError}</p>
        </div>
      )}
    </>
  );
}
```

---

## ✅ Phase 3 Complete! (4-6 hours)

**You now have:**
- ✅ Voice recording with MediaRecorder API
- ✅ Recording playback comparison
- ✅ Download recordings
- ✅ Retry functionality
- ✅ Microphone permission handling
- ✅ Error handling

**Completion: 90% → 100%** 🎉

---

## 🎨 Phase 4: Polish & Optimization (2-3 hours) - OPTIONAL

### Step 4.1: Mobile Responsive Design (1 hour)

**Update practice page layout for mobile:**

```tsx
// Responsive grid - stacks on mobile
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3">
    {/* Video */}
  </div>

  <div className="lg:col-span-2">
    {/* Transcript */}
  </div>
</div>

// Stack controls on mobile
<div className="flex flex-col lg:flex-row items-center gap-3">
  {/* Controls */}
</div>
```

---

### Step 4.2: Loading States & Error Handling (30 minutes)

**Add skeleton loaders:**

```tsx
{isLoading && (
  <div className="animate-pulse">
    <div className="bg-gray-800 h-96 rounded-lg mb-4"></div>
    <div className="bg-gray-800 h-64 rounded-lg"></div>
  </div>
)}
```

---

### Step 4.3: Performance Optimization (30 minutes)

**Optimize re-renders:**

```tsx
// Memoize expensive components
const MemoizedTranscriptViewer = React.memo(TranscriptViewer);
const MemoizedShadowingControls = React.memo(ShadowingControls);

// Use debounce for time updates
const debouncedTimeUpdate = useMemo(
  () => debounce(handleTimeUpdate, 100),
  [handleTimeUpdate]
);
```

---

### Step 4.4: Accessibility (30 minutes)

**Add ARIA labels and keyboard nav:**

```tsx
<button
  aria-label="Play video"
  role="button"
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handlePlayPause()}
>
  {/* ... */}
</button>
```

---

## 📊 Final Checklist

### Core Features ✅
- [x] Video playback with YouTube IFrame API
- [x] Custom player controls (play, pause, seek, volume, speed)
- [x] Transcript display with highlighting
- [x] Click-to-seek functionality
- [x] Practice mode with phrase hiding
- [x] Progress tracking (auto-saves every 10s)
- [x] Resume from last position
- [x] Keyboard shortcuts (Space, arrows, F, M, N, P, L, R, ?)

### Shadowing Features ✅
- [x] Next/Previous phrase navigation
- [x] Loop current phrase (3x auto-stop)
- [x] Practice statistics display
- [x] Completion tracking
- [x] Revealed phrases counter

### Recording Features ✅ (Optional)
- [x] Voice recording with MediaRecorder API
- [x] Recording playback comparison
- [x] Download recordings
- [x] Retry functionality

### Polish ✅
- [x] Mobile responsive layout
- [x] Loading states
- [x] Error handling
- [x] Help modal
- [x] Keyboard shortcut hints
- [x] Professional UI matching Transcribr

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# Backend .env
ASSEMBLY_AI_API_KEY=your_api_key_here
ASSEMBLY_AI_REQUEST_TIMEOUT=300
TRANSCRIPT_CACHE_TTL=2592000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...

# Frontend .env.local
NEXT_PUBLIC_API_URL=https://api.shadowspeak.com
```

### Performance
- [ ] Enable Redis caching
- [ ] Set up CDN for video thumbnails
- [ ] Enable gzip compression
- [ ] Minimize bundle size

### Testing
- [ ] Test all keyboard shortcuts
- [ ] Test on mobile devices
- [ ] Test with slow network (throttle)
- [ ] Test microphone permissions
- [ ] Test with long videos (30+ min)
- [ ] Test with videos in different languages

---

## 💰 Total Time Estimate

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Quick Wins | 1.5 hours | 🔥 MUST HAVE |
| Phase 2: Shadowing Controls | 3-4 hours | 🔥 MUST HAVE |
| Phase 3: Voice Recording | 4-6 hours | ⚠️ OPTIONAL |
| Phase 4: Polish | 2-3 hours | ✅ NICE TO HAVE |
| **TOTAL (without Phase 3)** | **4.5-5.5 hours** | - |
| **TOTAL (with everything)** | **10.5-14.5 hours** | - |

---

## 🎯 Success Metrics

After completion, users should be able to:

1. ✅ Select a video → practice page loads in <2s
2. ✅ See transcript synced with video highlighting
3. ✅ Control playback with buttons OR keyboard
4. ✅ Navigate phrases with Next/Previous
5. ✅ Loop difficult phrases 3x automatically
6. ✅ Track progress (auto-saved to backend)
7. ✅ Record voice and compare (optional)
8. ✅ Resume practice from where they left off
9. ✅ See real-time statistics
10. ✅ Use on mobile devices

---

## 🎉 You're Done!

Congratulations! You now have a **production-ready shadowing practice page** that rivals professional language learning platforms like Transcribr, FluentU, and Yabla.

**Next steps:**
- User testing and feedback
- Analytics integration
- Gamification (badges, streaks, XP)
- Social features (leaderboards, sharing)
- Advanced features (AI pronunciation feedback, spaced repetition)

Happy coding! 🚀
