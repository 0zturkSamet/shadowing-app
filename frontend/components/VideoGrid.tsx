'use client';

import { VideoResponse } from '@/types/video';
import VideoSkeleton from './VideoSkeleton';
import { useRouter } from 'next/navigation';
import { Play, Eye } from 'lucide-react';

interface VideoGridProps {
  videos: VideoResponse[];
  isLoading: boolean;
  onVideoClick: (videoId: string) => void;
}

export default function VideoGrid({ videos, isLoading, onVideoClick }: VideoGridProps) {
  const router = useRouter();

  /**
   * Format duration from seconds to MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format view count to human readable format
   */
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleVideoClick = (videoId: string) => {
    onVideoClick(videoId);
    router.push(`/practice/${videoId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <VideoSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      </div>
    );
  }

  // Videos grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => handleVideoClick(video.youtube_id)}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer group"
        >
          {/* Thumbnail */}
          <div className="relative h-48 overflow-hidden">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <Play className="w-16 h-16 text-white/80" />
              </div>
            )}

            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
              {formatDuration(video.duration)}
            </div>

            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {video.title}
            </h3>

            {/* Channel Name */}
            <p className="text-sm text-gray-600 mb-3">{video.channel_name}</p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{formatViewCount(video.view_count)} views</span>
              </div>
              <span className="uppercase font-medium">{video.language}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
