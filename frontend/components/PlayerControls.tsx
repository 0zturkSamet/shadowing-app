'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  BookOpen,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  practiceMode: boolean;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onProgressChange: (time: number) => void;
  onTogglePracticeMode: () => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  volume,
  isMuted,
  practiceMode,
  onPlayPause,
  onSpeedChange,
  onVolumeChange,
  onProgressChange,
  onTogglePracticeMode,
  onToggleFullscreen,
  onToggleMute,
  onSkipBackward,
  onSkipForward,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Format time to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    onProgressChange(newTime);
  };

  // Handle progress bar drag
  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleProgressClick(e);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 space-y-3">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div
          className="relative h-2 bg-gray-200 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseMove={handleProgressDrag}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Drag handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 8px)` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between">
        {/* Left controls */}
        <div className="flex items-center space-x-2">
          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-gray-900" />
            ) : (
              <Play className="w-6 h-6 text-gray-900" />
            )}
          </button>

          {/* Skip backward */}
          <button
            onClick={onSkipBackward}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Skip backward 5 seconds"
          >
            <SkipBack className="w-5 h-5 text-gray-700" />
          </button>

          {/* Skip forward */}
          <button
            onClick={onSkipForward}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Skip forward 5 seconds"
          >
            <SkipForward className="w-5 h-5 text-gray-700" />
          </button>

          {/* Volume */}
          <div className="flex items-center space-x-2 group">
            <button
              onClick={onToggleMute}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-700" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Volume slider */}
            <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-200">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Time display (desktop) */}
          <div className="hidden md:flex items-center text-sm text-gray-600 ml-2">
            <span className="font-medium">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-2">
          {/* Practice mode toggle */}
          <button
            onClick={onTogglePracticeMode}
            className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-2 ${
              practiceMode
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Toggle practice mode"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Practice</span>
          </button>

          {/* Speed selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2"
              aria-label="Playback speed"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">{playbackSpeed}x</span>
            </button>

            {/* Speed menu dropdown */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[100px]">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      onSpeedChange(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${
                      speed === playbackSpeed
                        ? 'text-indigo-600 font-medium bg-indigo-50'
                        : 'text-gray-700'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Toggle fullscreen"
          >
            <Maximize className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Practice mode indicator */}
      {practiceMode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-800">
          <p className="font-medium">Practice Mode Active</p>
          <p className="text-xs text-indigo-600 mt-1">
            Phrases are hidden. Click to reveal them as you practice.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;
