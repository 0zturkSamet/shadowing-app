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
        {/* Feature Controls - According to Spec: Preview, Next, Loop, Auto-scroll */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            onClick={onPrevious}
            className="shadowtube-button-outline px-6 py-3 flex items-center gap-2"
            title="Preview Previous (P)"
          >
            <SkipBack className="w-5 h-5" />
            <span>Preview</span>
          </button>

          <button
            onClick={onNext}
            className="shadowtube-button-outline px-6 py-3 flex items-center gap-2"
            title="Next Sentence (N)"
          >
            <SkipForward className="w-5 h-5" />
            <span>Next</span>
          </button>

          <button
            onClick={onLoop}
            className={`
              shadowtube-button px-6 py-3 flex items-center gap-2
              ${
                isLooping
                  ? "bg-youtube-red text-white hover:bg-primary-600"
                  : "bg-gray-200 text-secondary hover:bg-gray-300"
              }
            `}
            title="Loop Sentence (L)"
          >
            <RotateCw className={`w-5 h-5 ${isLooping ? 'animate-spin' : ''}`} />
            <span>Loop</span>
          </button>

          {onToggleAutoScroll && (
            <button
              onClick={onToggleAutoScroll}
              className={`
                shadowtube-button px-6 py-3 flex items-center gap-2
                ${
                  autoScroll
                    ? "bg-youtube-red text-white hover:bg-primary-600"
                    : "bg-gray-200 text-secondary hover:bg-gray-300"
                }
              `}
              title="Toggle Auto-scroll"
            >
              <ScrollText className="w-5 h-5" />
              <span>Auto-scroll</span>
            </button>
          )}
        </div>

        {/* Play/Pause - Centered Large Button */}
        <div className="flex justify-center">
          <button
            onClick={onPlayPause}
            className="shadowtube-button-primary p-6 rounded-full shadow-2xl"
            title="Play/Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white fill-white" />
            )}
          </button>
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
