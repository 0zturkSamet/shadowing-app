"use client";

import React from "react";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCw,
  BarChart3,
} from "lucide-react";

interface ControlPanelProps {
  isPlaying: boolean;
  isLooping: boolean;
  completedCount: number;
  totalCount: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLoop: () => void;
  onProgress: () => void;
}

export function ControlPanel({
  isPlaying,
  isLooping,
  completedCount,
  totalCount,
  onPlayPause,
  onPrevious,
  onNext,
  onLoop,
  onProgress,
}: ControlPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      {/* Main Controls */}
      <div className="mb-6">
        {/* Playback Controls - Centered */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onPrevious}
              className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
              title="Previous (P)"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-white" />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">Previous</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onPlayPause}
              className="p-3 sm:p-4 bg-red-600 hover:bg-red-700 rounded-full transition shadow-lg"
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
              )}
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onNext}
              className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
              title="Next (N)"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-white" />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">Next</span>
          </div>
        </div>

        {/* Feature Controls - Centered */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onLoop}
            className={`
              px-3 sm:px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 shadow-md text-sm sm:text-base
              ${
                isLooping
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }
            `}
            title="Loop Sentence (L)"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Loop</span>
          </button>

          <button
            onClick={onProgress}
            className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition flex items-center gap-2 text-sm sm:text-base"
            title="View Progress"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Progress</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {completedCount}/{totalCount}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Progress</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Day Streak</p>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Keyboard shortcuts:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              Space
            </span>{" "}
            Play/Pause
          </div>
          <div>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">N</span>{" "}
            Next
          </div>
          <div>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">P</span>{" "}
            Previous
          </div>
          <div>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">L</span>{" "}
            Loop
          </div>
        </div>
      </div>
    </div>
  );
}
