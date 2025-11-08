"use client";

import React from "react";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  RotateCw,
  Mic,
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
  onRecord: () => void;
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
  onRecord,
  onProgress,
}: ControlPanelProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      {/* Main Controls */}
      <div className="flex items-center justify-between mb-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onPrevious}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition"
            title="Previous (P)"
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
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition"
            title="Next (N)"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Feature Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLoop}
            className={`
              px-4 py-2 rounded-lg font-medium transition flex items-center gap-2
              ${
                isLooping
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }
            `}
            title="Loop Sentence (L)"
          >
            <RotateCw className="w-4 h-4" />
            Loop
          </button>

          <button
            onClick={onRecord}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center gap-2"
            title="Record (R)"
          >
            <Mic className="w-4 h-4" />
            Record
          </button>

          <button
            onClick={onProgress}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition flex items-center gap-2"
            title="View Progress"
          >
            <BarChart3 className="w-4 h-4" />
            Progress
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-800">
        <div>
          <p className="text-2xl font-bold text-white">
            {completedCount}/{totalCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Completed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-white">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Progress</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-white">-</p>
          <p className="text-xs text-gray-400 mt-1">Day Streak</p>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 mb-2">Keyboard shortcuts:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <span className="font-mono bg-gray-800 px-2 py-1 rounded">
              Space
            </span>{" "}
            Play/Pause
          </div>
          <div>
            <span className="font-mono bg-gray-800 px-2 py-1 rounded">N</span>{" "}
            Next
          </div>
          <div>
            <span className="font-mono bg-gray-800 px-2 py-1 rounded">P</span>{" "}
            Previous
          </div>
          <div>
            <span className="font-mono bg-gray-800 px-2 py-1 rounded">L</span>{" "}
            Loop
          </div>
        </div>
      </div>
    </div>
  );
}
