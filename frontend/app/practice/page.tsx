"use client";

import React, { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PracticeVideoPlayer } from "./components/VideoPlayer";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { ControlPanel } from "./components/ControlPanel";
import { useTranscript } from "@/lib/hooks/useTranscript";
import { useYouTubeSync } from "@/lib/hooks/useYouTubeSync";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { clearTranscriptCache } from "@/lib/services/transcriptCache";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, SkipBack, SkipForward, Play, Pause, ScrollText } from "lucide-react";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("v") || "";

  const videoRef = useRef<any>(null); // YouTube player ref
  const transcriptRef = useRef<HTMLDivElement>(null); // Transcript container ref
  const [playerReady, setPlayerReady] = useState(false);
  const [showSourceInfo, setShowSourceInfo] = useState(false);
  const [clearCacheNotification, setClearCacheNotification] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch transcript with intelligent fallback (YouTube → Web Speech)
  const { transcript, loading, error, source, progress, loadingMessage, refetch } = useTranscript(videoId);

  // Video synchronization with YouTube player
  const {
    state,
    jumpToTime,
    nextSentence,
    previousSentence,
    toggleLoopSentence,
    markSentenceComplete,
  } = useYouTubeSync(transcript?.transcript || [], videoRef, playerReady, videoId);

  // Toggle play/pause (YouTube IFrame API methods)
  const togglePlayPause = () => {
    console.log('[PracticePage] togglePlayPause called');
    console.log('[PracticePage] videoRef.current:', videoRef.current);
    console.log('[PracticePage] Has playVideo?', !!videoRef.current?.playVideo);
    console.log('[PracticePage] Has pauseVideo?', !!videoRef.current?.pauseVideo);

    if (videoRef.current && videoRef.current.playVideo && videoRef.current.pauseVideo) {
      try {
        if (state.isPlaying) {
          console.log('[PracticePage] Pausing video');
          videoRef.current.pauseVideo();
        } else {
          console.log('[PracticePage] Playing video');
          videoRef.current.playVideo();
        }
      } catch (error) {
        console.error("Error toggling video playback:", error);
      }
    } else {
      console.error('[PracticePage] Player not ready or missing methods');
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

  // Auto-scroll effect
  React.useEffect(() => {
    if (autoScroll && transcriptRef.current) {
      const currentElement = transcriptRef.current.querySelector(`[data-line="${state.currentSentenceIndex}"]`);
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [state.currentSentenceIndex, autoScroll]);

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
    let sourceBadge = "🔍 Checking sources...";
    if (loadingMessage.includes("YouTube")) {
      sourceBadge = "📺 From YouTube";
    } else if (loadingMessage.includes("live transcript") || loadingMessage.includes("Extracting")) {
      sourceBadge = "🎤 Live Transcription";
    } else if (loadingMessage.includes("cache")) {
      sourceBadge = "💾 From Cache";
    }

    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-youtube-red mx-auto mb-6"></div>
          <div className="mb-4">
            <span className="inline-block px-4 py-2 bg-youtube-red/10 text-youtube-red rounded-full text-sm font-medium border border-youtube-red/30">
              {sourceBadge}
            </span>
          </div>
          <p className="text-secondary text-lg font-medium mb-2">
            {loadingMessage}
          </p>
          <div className="mt-6 w-80 mx-auto">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-youtube-red to-primary-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-600 text-sm mt-2 font-mono">{progress}%</p>
          </div>
          <p className="text-gray-500 text-xs mt-6">
            This may take a moment while we fetch your transcript...
          </p>
        </div>
      </div>
    );
  }

  // Error state - only show if we have an actual error AND we're not loading
  if (error && !loading) {
    const isBrowserUnsupported = error?.type === "browser_unsupported";
    const isInvalidVideo = error?.type === "invalid_video";
    const isNoCaptions = error?.type === "no_captions";

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">
            Could not load transcript
          </h2>

          {/* Error Message */}
          <p className="text-gray-800 dark:text-gray-300 mb-2">
            {error?.message || "An unexpected error occurred"}
          </p>

          {/* Helpful suggestions based on error type */}
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700 text-left">
            <p className="text-gray-700 dark:text-gray-400 text-sm mb-2 font-medium">💡 What you can do:</p>
            <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-1 list-disc list-inside">
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
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-lg hover:shadow-xl"
              >
                🔄 Try Again
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              ← Go Back
            </button>
          </div>

          {/* Additional help text */}
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-6">
            Need help? Check that your browser supports modern web features and that the video has captions available.
          </p>
        </div>
      </div>
    );
  }

  // Don't render if transcript is not loaded yet
  if (!transcript) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-youtube-red mx-auto mb-6"></div>
          <p className="text-secondary text-lg">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Sub-Header with Video Info */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="shadowtube-button-outline px-4 py-2 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-secondary">
                Practice Shadowing
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {state.currentSentenceIndex + 1} / {transcript.transcript.length} phrases
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Source Badge */}
            {source === "cache" && (
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                💾 Cached
              </span>
            )}
            {source === "youtube" && (
              <span className="px-3 py-1.5 bg-youtube-red/10 text-youtube-red rounded-full text-xs font-medium border border-youtube-red/30">
                📺 YouTube
              </span>
            )}
            {source === "web_speech" && (
              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                🎤 Live
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Wireframe Design: 2-column layout */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Video Player + Controls */}
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-black rounded-2xl overflow-hidden shadow-lg aspect-video">
              <PracticeVideoPlayer
                ref={videoRef}
                videoId={videoId}
                isPlaying={state.isPlaying}
                onTogglePlay={togglePlayPause}
                onPlayerReady={setPlayerReady}
              />
            </div>

            {/* Controls - Wireframe Style */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {/* Preview Button */}
              <button
                onClick={previousSentence}
                className="px-6 py-3 bg-white border-2 border-black rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 font-semibold"
                title="Preview Previous (P)"
              >
                <SkipBack className="w-4 h-4" />
                Preview
              </button>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="px-8 py-3 bg-youtube-red text-white rounded-full hover:bg-primary-600 transition-all shadow-lg flex items-center gap-2"
                title="Play/Pause (Space)"
              >
                {state.isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-white" />
                )}
              </button>

              {/* Next Button */}
              <button
                onClick={nextSentence}
                className="px-6 py-3 bg-white border-2 border-black rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 font-semibold"
                title="Next Sentence (N)"
              >
                Next
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Loop Button - Green when active */}
              <button
                onClick={toggleLoopSentence}
                className={`px-6 py-3 rounded-full transition-all font-semibold ${
                  state.isLooping
                    ? "bg-green-600 text-white"
                    : "bg-white border-2 border-gray-300 hover:border-youtube-red"
                }`}
                title="Loop Sentence (L)"
              >
                Loop {state.isLooping ? "ON" : "OFF"}
              </button>

              {/* Auto-scroll Button */}
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-6 py-3 rounded-full transition-all flex items-center gap-2 font-semibold ${
                  autoScroll
                    ? "bg-youtube-red text-white"
                    : "bg-white border-2 border-gray-300 hover:border-youtube-red"
                }`}
                title="Toggle Auto-scroll"
              >
                <ScrollText className="w-4 h-4" />
                Auto-scroll {autoScroll ? "ON" : "OFF"}
              </button>
            </div>

            {/* Progress Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {state.completedSentences.size}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-youtube-red">
                    {transcript.transcript.length > 0
                      ? Math.round(
                          (state.completedSentences.size /
                            transcript.transcript.length) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Progress</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {transcript.transcript.length}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Transcript - Wireframe Style */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Transcript</h3>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{state.currentSentenceIndex + 1} / {transcript.transcript.length}</span>
              </div>
            </div>
            <div
              ref={transcriptRef}
              className="space-y-3 overflow-y-auto max-h-[600px] pr-2"
              style={{ scrollBehavior: "smooth" }}
            >
              {transcript.transcript.map((sentence, index) => {
                const isCurrentSentence = index === state.currentSentenceIndex;

                return (
                  <div
                    key={sentence.sentence_id}
                    data-line={index}
                    onClick={() => jumpToTime(sentence.start_time)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      isCurrentSentence
                        ? "bg-youtube-red text-white"
                        : "bg-gray-50 text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <p className={`text-sm leading-relaxed ${
                      isCurrentSentence ? "text-white font-semibold" : "text-black"
                    }`}>
                      {sentence.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Cache Clear Notification */}
      {clearCacheNotification && (
        <div className="fixed bottom-8 right-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-6 py-4 max-w-sm animate-in slide-in-from-bottom">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center border border-red-600/30">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium text-sm">Cache Cleared</p>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{clearCacheNotification}</p>
            </div>
            <button
              onClick={() => setClearCacheNotification(null)}
              className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transcript Source</h3>
              <button
                onClick={() => setShowSourceInfo(false)}
                className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Source Badge */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-3xl">
                  {source === "cache" && "💾"}
                  {source === "whisper" && "🤖"}
                  {source === "youtube" && "📺"}
                  {source === "web_speech" && "🎤"}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {source === "cache" && "Cached Transcript"}
                    {source === "whisper" && "Whisper AI Transcript"}
                    {source === "youtube" && "YouTube Captions"}
                    {source === "web_speech" && "Live Transcription"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {source === "cache" && "Loaded from local storage"}
                    {source === "whisper" && "Transcribed with OpenAI Whisper"}
                    {source === "youtube" && "Fetched from YouTube API"}
                    {source === "web_speech" && "Real-time Web Speech API"}
                  </p>
                </div>
              </div>

              {/* Transcript Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Sentences</p>
                  <p className="text-gray-900 dark:text-white font-bold text-lg">{transcript.totalSentences}</p>
                </div>
                {transcript.confidence !== undefined && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Confidence</p>
                    <p className="text-gray-900 dark:text-white font-bold text-lg">
                      {Math.round(transcript.confidence * 100)}%
                    </p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Language</p>
                  <p className="text-gray-900 dark:text-white font-bold text-lg uppercase">{transcript.language}</p>
                </div>
                {transcript.cached && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Cached</p>
                    <p className="text-green-600 dark:text-green-400 font-bold text-lg">Yes</p>
                  </div>
                )}
              </div>

              {/* Keyboard Shortcuts */}
              <div className="p-4 bg-red-50 dark:bg-red-600/10 rounded-lg border border-red-200 dark:border-red-600/30">
                <p className="text-red-600 dark:text-red-400 text-xs font-medium mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Refresh transcript</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Clear cache</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono">C</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Show source info</span>
                    <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700 font-mono">S</kbd>
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
