"use client";

import React, { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PracticeVideoPlayer } from "./components/VideoPlayer";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ControlPanel } from "./components/ControlPanel";
import { useTranscript } from "@/lib/hooks/useTranscript";
import { useVideoSync } from "@/lib/hooks/useVideoSync";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("v") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Fetch transcript using Assembly AI
  const { transcript, loading, error } = useTranscript(videoId);

  // Video synchronization
  const {
    state,
    jumpToTime,
    nextSentence,
    previousSentence,
    toggleLoopSentence,
    markSentenceComplete,
  } = useVideoSync(transcript?.transcript || [], videoRef);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: togglePlayPause,
    onNext: nextSentence,
    onPrevious: previousSentence,
    onLoop: toggleLoopSentence,
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading transcript...</p>
          <p className="text-gray-500 text-sm mt-2">Powered by Assembly AI</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !transcript) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading transcript</p>
          <p className="text-gray-400 text-sm">
            {error?.message || "Please try again"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Practice Shadowing
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {state.currentSentenceIndex + 1} / {transcript.transcript.length}
              {transcript.cached && (
                <span className="ml-2 text-green-400">(Cached)</span>
              )}
              {transcript.source === "assembly_ai" && (
                <span className="ml-2 text-blue-400">(Assembly AI)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
            >
              Quit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Video Player (Left - 2/3) */}
          <div className="col-span-2 h-[600px]">
            <PracticeVideoPlayer
              ref={videoRef}
              videoId={videoId}
              isPlaying={state.isPlaying}
              volume={volume}
              isMuted={isMuted}
              onTogglePlay={togglePlayPause}
              onVolumeChange={setVolume}
              onToggleMute={() => setIsMuted(!isMuted)}
              onFullscreen={() => {
                if (videoRef.current) {
                  videoRef.current.requestFullscreen();
                }
              }}
            />
          </div>

          {/* Transcript Panel (Right - 1/3) */}
          <div className="h-[600px]">
            <TranscriptPanel
              sentences={transcript.transcript}
              currentSentenceIndex={state.currentSentenceIndex}
              completedSentences={state.completedSentences}
              onSentenceClick={(index) => {
                jumpToTime(transcript.transcript[index].start_time);
              }}
              onMarkComplete={markSentenceComplete}
            />
          </div>
        </div>

        {/* Control Panel */}
        <div className="mt-8">
          <ControlPanel
            isPlaying={state.isPlaying}
            isLooping={state.isLooping}
            completedCount={state.completedSentences.size}
            totalCount={transcript.transcript.length}
            onPlayPause={togglePlayPause}
            onPrevious={previousSentence}
            onNext={nextSentence}
            onLoop={toggleLoopSentence}
            onRecord={() => console.log("Record - TODO")}
            onProgress={() => console.log("Progress - TODO")}
          />
        </div>
      </div>
    </div>
  );
}
