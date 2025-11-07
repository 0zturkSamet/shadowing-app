'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import TranscriptViewer from '@/components/TranscriptViewer';
import PlayerControls from '@/components/PlayerControls';
import PracticeMode from '@/components/PracticeMode';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { VideoResponse, PhraseSchema } from '@/types/video';
import { getVideoDetails, getTranscript } from '@/services/videoApi';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoResponse | null>(null);
  const [phrases, setPhrases] = useState<PhraseSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch video details and transcript
  useEffect(() => {
    const fetchVideoData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [videoDetails, transcriptData] = await Promise.all([
          getVideoDetails(videoId),
          getTranscript(videoId),
        ]);

        setVideo(videoDetails);
        setPhrases(transcriptData.phrases);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (videoId) {
      fetchVideoData();
    }
  }, [videoId]);

  // Initialize video player hook
  const videoPlayerHook = useVideoPlayer({
    videoId,
    phrases,
    initialProgress: 0,
  });

  // Handle phrase click - seek to phrase
  const handlePhraseClick = (index: number, startTime: number) => {
    videoPlayerHook.seekToPhrase(index);
  };

  // Handle progress update
  const handleProgressUpdate = (timestamp: number) => {
    // Progress is automatically tracked in the hook
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
              <p className="text-xl text-gray-600">Loading video...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-2xl mx-auto">
            <div className="flex items-start space-x-4">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-900 mb-2">Failed to Load Video</h2>
                <p className="text-red-700 mb-4">{error || 'Video not found'}</p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        {/* Video Info Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{video.title}</h1>
          <p className="text-gray-600">{video.channel_name}</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Video Player */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <VideoPlayer
                videoId={video.youtube_id}
                phrases={phrases}
                onPhraseClick={handlePhraseClick}
                onProgressUpdate={handleProgressUpdate}
                isPlaying={videoPlayerHook.isPlaying}
                currentTime={videoPlayerHook.currentTime}
                playbackSpeed={videoPlayerHook.playbackSpeed}
                volume={videoPlayerHook.volume}
                isMuted={videoPlayerHook.isMuted}
                onPlay={videoPlayerHook.play}
                onPause={videoPlayerHook.pause}
                onTimeUpdate={videoPlayerHook.setCurrentTime}
                onDurationChange={videoPlayerHook.setDuration}
                onSeek={videoPlayerHook.seek}
              />

              {/* Player Controls */}
              <PlayerControls
                isPlaying={videoPlayerHook.isPlaying}
                currentTime={videoPlayerHook.currentTime}
                duration={videoPlayerHook.duration}
                playbackSpeed={videoPlayerHook.playbackSpeed}
                volume={videoPlayerHook.volume}
                isMuted={videoPlayerHook.isMuted}
                practiceMode={videoPlayerHook.practiceMode}
                onPlayPause={videoPlayerHook.togglePlayPause}
                onSpeedChange={videoPlayerHook.setPlaybackSpeed}
                onVolumeChange={videoPlayerHook.setVolume}
                onProgressChange={videoPlayerHook.seek}
                onTogglePracticeMode={videoPlayerHook.togglePracticeMode}
                onToggleFullscreen={videoPlayerHook.toggleFullscreen}
                onToggleMute={videoPlayerHook.toggleMute}
                onSkipBackward={() => videoPlayerHook.seek(videoPlayerHook.currentTime - 5)}
                onSkipForward={() => videoPlayerHook.seek(videoPlayerHook.currentTime + 5)}
              />
            </div>

            {/* Practice Mode Info (Desktop) */}
            <div className="hidden lg:block">
              <PracticeMode
                practiceMode={videoPlayerHook.practiceMode}
                onTogglePracticeMode={videoPlayerHook.togglePracticeMode}
                practiceAttempts={videoPlayerHook.practiceAttempts}
                totalPhrases={phrases.length}
              />
            </div>
          </div>

          {/* Right Column - Transcript */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                <span>Transcript</span>
                <span className="text-sm font-normal text-gray-500">
                  {phrases.length} phrases
                </span>
              </h3>

              <TranscriptViewer
                phrases={phrases}
                currentTime={videoPlayerHook.currentTime}
                currentPhraseIndex={videoPlayerHook.currentPhraseIndex}
                onPhraseClick={handlePhraseClick}
                practiceMode={videoPlayerHook.practiceMode}
                practiceAttempts={videoPlayerHook.practiceAttempts}
                onRevealPhrase={videoPlayerHook.revealPhrase}
                currentLanguage={video.language}
              />
            </div>
          </div>
        </div>

        {/* Practice Mode Info (Mobile) */}
        <div className="lg:hidden mt-6">
          <PracticeMode
            practiceMode={videoPlayerHook.practiceMode}
            onTogglePracticeMode={videoPlayerHook.togglePracticeMode}
            practiceAttempts={videoPlayerHook.practiceAttempts}
            totalPhrases={phrases.length}
          />
        </div>
      </main>
    </div>
  );
}
