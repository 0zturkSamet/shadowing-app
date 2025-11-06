'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ArrowLeft, Loader2, AlertCircle, Clock } from 'lucide-react';
import { VideoResponse, PhraseSchema } from '@/types/video';
import { getVideoDetails, getTranscript } from '@/services/videoApi';

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoResponse | null>(null);
  const [phrases, setPhrases] = useState<PhraseSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhraseIndex, setSelectedPhraseIndex] = useState<number | null>(null);

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

  /**
   * Format timestamp to MM:SS
   */
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle phrase click to seek video
   */
  const handlePhraseClick = (index: number) => {
    setSelectedPhraseIndex(index);
    // Note: In a full implementation, you would use YouTube Player API
    // to seek to the specific timestamp
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Video Info Header */}
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
                <p className="text-gray-600">{video.channel_name}</p>
              </div>

              {/* YouTube Embedded Player */}
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${video.youtube_id}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Transcript</h3>

              {phrases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No transcript available for this video.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {phrases.map((phrase, index) => (
                    <div
                      key={index}
                      onClick={() => handlePhraseClick(index)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedPhraseIndex === index
                          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {formatTimestamp(phrase.start_time)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${
                        selectedPhraseIndex === index ? 'text-gray-900 font-medium' : 'text-gray-700'
                      }`}>
                        {phrase.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
