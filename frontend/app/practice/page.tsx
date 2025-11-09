"use client";

import React, { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PracticeVideoPlayer } from "./components/VideoPlayer";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ControlPanel } from "./components/ControlPanel";
import { useTranscript } from "@/lib/hooks/useTranscript";
import { useVideoSync } from "@/lib/hooks/useVideoSync";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { clearTranscriptCache } from "@/lib/services/transcriptCache";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("v") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const [clearCacheNotification, setClearCacheNotification] = useState<string | null>(null);

  // Fetch transcript with intelligent fallback (YouTube → Web Speech)
  const { transcript, loading, error, source, progress, loadingMessage, refetch } = useTranscript(videoId);

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

  // Handle clear cache
  const handleClearCache = async () => {
    try {
      const count = await clearTranscriptCache(videoId);
      if (count > 0) {
        setClearCacheNotification("Cache cleared! Transcript will be re-fetched on next load.");
      } else {
        setClearCacheNotification("No cache found for this video.");
      }
      // Auto-hide notification after 3 seconds
      setTimeout(() => setClearCacheNotification(null), 3000);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      setClearCacheNotification("Failed to clear cache.");
      setTimeout(() => setClearCacheNotification(null), 3000);
    }
  };

  // Handle show source info
  const handleShowSource = () => {
    setShowSourceInfo(true);
    // Auto-hide after 5 seconds
    setTimeout(() => setShowSourceInfo(false), 5000);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTogglePlayPause: togglePlayPause,
    onNext: nextSentence,
    onPrevious: previousSentence,
    onLoop: toggleLoopSentence,
    onRefresh: refetch,
    onClearCache: handleClearCache,
    onShowSource: handleShowSource,
  });

  // Loading state
  if (loading) {
    // Determine source badge based on loading message
    let sourceBadge = "🔍 Checking sources...";
    if (loadingMessage.includes("YouTube")) {
      sourceBadge = "📺 From YouTube";
    } else if (loadingMessage.includes("live transcript") || loadingMessage.includes("Extracting")) {
      sourceBadge = "🎤 Live Transcription";
    } else if (loadingMessage.includes("cache")) {
      sourceBadge = "💾 From Cache";
    }

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>

          {/* Source Badge */}
          <div className="mb-4">
            <span className="inline-block px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium border border-blue-600/30">
              {sourceBadge}
            </span>
          </div>

          {/* Loading Message */}
          <p className="text-gray-300 text-lg font-medium mb-2">
            {loadingMessage}
          </p>

          {/* Progress Bar */}
          <div className="mt-6 w-80 mx-auto">
            <div className="bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-400 text-sm mt-2 font-mono">{progress}%</p>
          </div>

          {/* Helpful hint */}
          <p className="text-gray-500 text-xs mt-6">
            This may take a moment while we fetch your transcript...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !transcript) {
    const isBrowserUnsupported = error?.type === "browser_unsupported";
    const isInvalidVideo = error?.type === "invalid_video";
    const isNoCaptions = error?.type === "no_captions";

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-red-400 mb-3">
            Could not load transcript
          </h2>

          {/* Error Message */}
          <p className="text-gray-300 mb-2">
            {error?.message || "An unexpected error occurred"}
          </p>

          {/* Helpful suggestions based on error type */}
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-left">
            <p className="text-gray-400 text-sm mb-2 font-medium">💡 What you can do:</p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              {isBrowserUnsupported && (
                <>
                  <li>Use a modern browser (Chrome, Edge, or Safari)</li>
                  <li>Enable microphone permissions for live transcription</li>
                  <li>Try a different video with captions available</li>
                </>
              )}
              {isInvalidVideo && (
                <>
                  <li>Check that the video ID is correct</li>
                  <li>Make sure the video is public and accessible</li>
                  <li>Try a different YouTube video</li>
                </>
              )}
              {isNoCaptions && (
                <>
                  <li>Try a video with available captions/subtitles</li>
                  <li>Use a browser that supports Web Speech API for live transcription</li>
                  <li>Upload your own transcript (coming soon)</li>
                </>
              )}
              {!isBrowserUnsupported && !isInvalidVideo && !isNoCaptions && (
                <>
                  <li>Check your internet connection</li>
                  <li>Try refreshing the page</li>
                  <li>Make sure the video is accessible</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            {error?.retryable && (
              <button
                onClick={refetch}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-lg hover:shadow-xl"
              >
                🔄 Try Again
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
            >
              ← Go Back
            </button>
          </div>

          {/* Additional help text */}
          <p className="text-gray-500 text-xs mt-6">
            Need help? Check that your browser supports modern web features and that the video has captions available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Practice Shadowing
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {state.currentSentenceIndex + 1} / {transcript.transcript.length} sentences
              </p>
            </div>
            {/* Source Badge */}
            {source === "cache" && (
              <span className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded-full text-xs font-medium border border-green-600/30 flex items-center gap-1.5">
                💾 Cached
              </span>
            )}
            {source === "youtube" && (
              <span className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium border border-blue-600/30 flex items-center gap-1.5">
                📺 YouTube Captions
              </span>
            )}
            {source === "web_speech" && (
              <span className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full text-xs font-medium border border-purple-600/30 flex items-center gap-1.5">
                🎤 Live Transcription
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition flex items-center gap-2"
              title="Refresh transcript (R)"
            >
              🔄 Refresh
            </button>
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
              source={source}
              confidence={transcript.confidence}
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

      {/* Cache Clear Notification */}
      {clearCacheNotification && (
        <div className="fixed bottom-8 right-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl px-6 py-4 max-w-sm animate-in slide-in-from-bottom">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-600/30">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Cache Cleared</p>
              <p className="text-gray-400 text-xs mt-1">{clearCacheNotification}</p>
            </div>
            <button
              onClick={() => setClearCacheNotification(null)}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Source Info Modal */}
      {showSourceInfo && transcript && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Transcript Source</h3>
              <button
                onClick={() => setShowSourceInfo(false)}
                className="text-gray-500 hover:text-gray-300 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Source Badge */}
              <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-3xl">
                  {source === "cache" && "💾"}
                  {source === "youtube" && "📺"}
                  {source === "web_speech" && "🎤"}
                </div>
                <div>
                  <p className="text-white font-medium">
                    {source === "cache" && "Cached Transcript"}
                    {source === "youtube" && "YouTube Captions"}
                    {source === "web_speech" && "Live Transcription"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {source === "cache" && "Loaded from local storage"}
                    {source === "youtube" && "Fetched from YouTube API"}
                    {source === "web_speech" && "Real-time Web Speech API"}
                  </p>
                </div>
              </div>

              {/* Transcript Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Sentences</p>
                  <p className="text-white font-bold text-lg">{transcript.totalSentences}</p>
                </div>
                {transcript.confidence !== undefined && (
                  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-xs">Confidence</p>
                    <p className="text-white font-bold text-lg">
                      {Math.round(transcript.confidence * 100)}%
                    </p>
                  </div>
                )}
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-xs">Language</p>
                  <p className="text-white font-bold text-lg uppercase">{transcript.language}</p>
                </div>
                {transcript.cached && (
                  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-xs">Cached</p>
                    <p className="text-green-400 font-bold text-lg">Yes</p>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="p-4 bg-blue-600/10 rounded-lg border border-blue-600/30">
                <p className="text-blue-400 text-xs font-medium mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>Refresh transcript</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700 font-mono">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Clear cache</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700 font-mono">C</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Show source info</span>
                    <kbd className="px-2 py-0.5 bg-gray-800 rounded border border-gray-700 font-mono">S</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
