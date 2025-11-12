'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration: number;
  channel_name: string;
  language: string;
}

interface NoContentPanelProps {
  videoId: string;
}

export function NoContentPanel({ videoId }: NoContentPanelProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [recommendations, setRecommendations] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/videos/${videoId}/recommendations?limit=3`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        // Handle 401 Unauthorized - let auth context handle it
        if (response.status === 401) {
          console.warn('Unauthorized request while fetching recommendations');
          return;
        }

        const data = await response.json();

        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [videoId, token]);

  const handleVideoClick = (vid: Video) => {
    router.push(`/practice?v=${vid.id}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-3xl w-full">

        {/* Main message */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            No Practice Content Available
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            This video doesn't have a transcript or captions.
            But don't worry! We found some great alternatives for you.
          </p>
        </div>

        {/* Recommendations section */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Finding similar videos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Try these videos instead:
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                >
                  {/* Thumbnail */}
                  {video.thumbnail_url && (
                    <div className="relative w-full h-32 bg-gray-200 overflow-hidden">
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {video.channel_name}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {video.language?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-800">
              No similar videos found, but you can search for more content!
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            ← Go Back
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            🔍 Search for Videos
          </button>
        </div>

      </div>
    </div>
  );
}
