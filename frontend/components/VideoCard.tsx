import Link from 'next/link';
import { Video } from '@/types';
import { Play, Clock } from 'lucide-react';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
        <Play className="w-16 h-16 text-white/80 group-hover:scale-110 transition-transform" />
        {video.thumbnail_url && (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Difficulty Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(video.difficulty)}`}>
            {video.difficulty}
          </span>
        </div>
        {/* Duration */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded flex items-center space-x-1 text-xs">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(video.duration)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {video.title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {video.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase font-medium">
            {video.language}
          </span>
          <Link href={`/practice/${video.id}`}>
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105">
              Start Practice
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
