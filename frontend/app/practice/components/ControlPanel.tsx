"use client";

import React from "react";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCw,
  Eye,
  ScrollText,
} from "lucide-react";

interface ControlPanelProps {
  isPlaying: boolean;
  isLooping: boolean;
  autoScroll?: boolean;
  completedCount: number;
  totalCount: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLoop: () => void;
  onToggleAutoScroll?: () => void;
  onProgress: () => void;
}

export function ControlPanel({
  isPlaying,
  isLooping,
  autoScroll = true,
  completedCount,
  totalCount,
  onPlayPause,
  onPrevious,
  onNext,
  onLoop,
  onToggleAutoScroll,
  onProgress,
}: ControlPanelProps) {
  return (
    <div className="shadowtube-card p-6">
      {/* ShadowTube Control Panel */}
      <div className="mb-6">
        {/* Feature Controls - Preview, Play/Pause, Next in center, Loop and Auto-scroll on sides */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {/* Preview Button - Black text */}
          <button
            onClick={onPrevious}
            className="shadowtube-button-outline px-6 py-3 flex items-center gap-2 text-black border-black hover:bg-gray-100"
            title="Preview Previous (P)"
          >
            <SkipBack className="w-5 h-5" />
            <span className="font-semibold">Preview</span>
          </button>

          {/* Play/Pause - Center Button */}
          <button
            onClick={onPlayPause}
            className="shadowtube-button-primary px-8 py-3 rounded-full shadow-lg flex items-center gap-2"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white" />
            )}
          </button>

          {/* Next Button - Black text */}
          <button
            onClick={onNext}
            className="shadowtube-button-outline px-6 py-3 flex items-center gap-2 text-black border-black hover:bg-gray-100"
            title="Next Sentence (N)"
          >
            <SkipForward className="w-5 h-5" />
            <span className="font-semibold">Next</span>
          </button>

          {/* Loop Button - Green when active */}
          <button
            onClick={onLoop}
            className={`
              shadowtube-button px-6 py-3 flex items-center gap-2
              ${
                isLooping
                  ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                  : "bg-gray-200 text-secondary hover:bg-gray-300 border-gray-300"
              }
            `}
            title="Loop Sentence (L)"
          >
            <RotateCw className={`w-5 h-5 ${isLooping ? 'animate-spin' : ''}`} />
            <span className="font-semibold">Loop</span>
          </button>

          {/* Auto-scroll Button */}
          {onToggleAutoScroll && (
            <button
              onClick={onToggleAutoScroll}
              className={`
                shadowtube-button px-6 py-3 flex items-center gap-2
                ${
                  autoScroll
                    ? "bg-youtube-red text-white hover:bg-primary-600 border-youtube-red"
                    : "bg-gray-200 text-secondary hover:bg-gray-300 border-gray-300"
                }
              `}
              title="Toggle Auto-scroll"
            >
              <ScrollText className="w-5 h-5" />
              <span className="font-semibold">Auto-scroll</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center pt-6 border-t border-gray-200">
        <div>
          <p className="text-2xl font-bold text-secondary">
            {completedCount}
          </p>
          <p className="text-xs text-gray-600 mt-1">Completed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-youtube-red">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-600 mt-1">Progress</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-secondary">
            {totalCount}
          </p>
          <p className="text-xs text-gray-600 mt-1">Total</p>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 font-semibold mb-3">Keyboard shortcuts:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <kbd className="font-mono bg-gray-100 px-2 py-1 rounded-shadowtube border border-gray-300">
              Space
            </kbd>{" "}
            Play/Pause
          </div>
          <div>
            <kbd className="font-mono bg-gray-100 px-2 py-1 rounded-shadowtube border border-gray-300">N</kbd>{" "}
            Next
          </div>
          <div>
            <kbd className="font-mono bg-gray-100 px-2 py-1 rounded-shadowtube border border-gray-300">P</kbd>{" "}
            Previous
          </div>
          <div>
            <kbd className="font-mono bg-gray-100 px-2 py-1 rounded-shadowtube border border-gray-300">L</kbd>{" "}
            Loop
          </div>
        </div>
      </div>
    </div>
  );
}
