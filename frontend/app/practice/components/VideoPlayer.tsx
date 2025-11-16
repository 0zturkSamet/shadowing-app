"use client";

import React, { forwardRef, useEffect, useRef, useState, useImperativeHandle } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  videoId: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayerReady?: (ready: boolean) => void;
}

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const PracticeVideoPlayer = forwardRef<any, VideoPlayerProps>(
  function PracticeVideoPlayer(
    {
      videoId,
      isPlaying,
      onTogglePlay,
      onPlayerReady,
    },
    ref
  ) {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [playerReady, setPlayerReady] = useState(false);

    // Expose player to parent via ref using useImperativeHandle
    // Update whenever playerReady changes to ensure ref is set after player initialization
    useImperativeHandle(ref, () => playerRef.current, [playerReady]);

    // Load YouTube IFrame API
    useEffect(() => {
      console.log('[VideoPlayer] Initializing for video:', videoId);

      const initializePlayer = () => {
        if (containerRef.current && !playerRef.current) {
          console.log('[VideoPlayer] Creating YouTube player');
          playerRef.current = new window.YT.Player(containerRef.current, {
            videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3,
            },
            events: {
              onReady: (event: any) => {
                console.log('[VideoPlayer] Player ready!');
                console.log('[VideoPlayer] Player instance:', playerRef.current);
                setPlayerReady(true);
                event.target.setVolume(100);
                // Notify parent that player is ready
                if (onPlayerReady) {
                  onPlayerReady(true);
                }
              },
            },
          });
        }
      };

      if (!window.YT) {
        console.log('[VideoPlayer] Loading YouTube IFrame API');
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          console.log('[VideoPlayer] YouTube API ready');
          initializePlayer();
        };
      } else if (window.YT.Player) {
        console.log('[VideoPlayer] YouTube API already loaded');
        initializePlayer();
      }

      return () => {
        if (playerRef.current && playerRef.current.destroy) {
          console.log('[VideoPlayer] Destroying player');
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [videoId, ref]);

    // Handle play/pause changes
    useEffect(() => {
      if (playerReady && playerRef.current) {
        const playerState = playerRef.current.getPlayerState();
        if (isPlaying && playerState !== 1) {
          playerRef.current.playVideo();
        } else if (!isPlaying && playerState === 1) {
          playerRef.current.pauseVideo();
        }
      }
    }, [isPlaying, playerReady]);


    return (
      <div className="relative bg-black rounded-lg overflow-hidden h-full shadow-xl">
        {/* Video Container */}
        <div className="relative w-full h-full">
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    );
  }
);
