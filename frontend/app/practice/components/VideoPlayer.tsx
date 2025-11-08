"use client";

import React, { forwardRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

export const PracticeVideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function PracticeVideoPlayer(
    {
      videoId,
      isPlaying,
      volume,
      isMuted,
      onTogglePlay,
      onVolumeChange,
      onToggleMute,
      onFullscreen,
    },
    ref
  ) {
    const videoUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

    return (
      <div className="flex flex-col gap-4 bg-black rounded-lg overflow-hidden h-full">
        {/* Video Container */}
        <div className="relative w-full aspect-video bg-black flex-1">
          {/* Using iframe for YouTube embed */}
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`YouTube video ${videoId}`}
          />

          {/* Play Button Overlay (when paused) */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
              onClick={onTogglePlay}
            >
              <Play className="w-20 h-20 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 pb-4 space-y-2">
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                className="p-2 hover:bg-gray-800 rounded transition"
                title="Play/Pause (Space)"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white" />
                )}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 ml-2">
                <button onClick={onToggleMute}>
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={onFullscreen}
              className="p-2 hover:bg-gray-800 rounded transition"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
