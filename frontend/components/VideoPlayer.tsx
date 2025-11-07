'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PhraseSchema } from '@/types/video';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  phrases: PhraseSchema[];
  onPhraseClick: (index: number, startTime: number) => void;
  onProgressUpdate: (timestamp: number) => void;
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  onPlay: () => void;
  onPause: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  isPlaying,
  playbackSpeed,
  volume,
  isMuted,
  onPlay,
  onPause,
  onTimeUpdate,
  onDurationChange,
  onSeek,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true);
    };
  }, []);

  // Initialize player
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: (event: any) => {
          setIsLoading(false);
          const duration = event.target.getDuration();
          onDurationChange(duration);

          // Start time tracking
          intervalRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
              const currentTime = playerRef.current.getCurrentTime();
              onTimeUpdate(currentTime);
            }
          }, 100);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            onPlay();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            onPause();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            onPause();
          }
        },
      },
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [isReady, videoId, onDurationChange, onTimeUpdate, onPlay, onPause]);

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.getPlayerState) return;

    const playerState = playerRef.current.getPlayerState();
    const isPlayerPlaying = playerState === window.YT.PlayerState.PLAYING;

    if (isPlaying && !isPlayerPlaying) {
      playerRef.current.playVideo();
    } else if (!isPlaying && isPlayerPlaying) {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  // Handle playback speed
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.setPlaybackRate) return;

    playerRef.current.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed]);

  // Handle volume
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.setVolume) return;

    playerRef.current.setVolume(volume);
  }, [volume]);

  // Handle mute
  useEffect(() => {
    if (!playerRef.current) return;

    if (isMuted && playerRef.current.mute) {
      playerRef.current.mute();
    } else if (!isMuted && playerRef.current.unMute) {
      playerRef.current.unMute();
    }
  }, [isMuted]);

  // Expose seek method
  useEffect(() => {
    if (playerRef.current && playerRef.current.seekTo) {
      (playerRef.current as any).customSeek = (time: number) => {
        playerRef.current.seekTo(time, true);
      };
    }
  }, []);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default VideoPlayer;
