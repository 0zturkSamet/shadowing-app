'use client';

import Header from '@/components/Header';
import VideoSearchBar from '@/components/VideoSearchBar';
import VideoGrid from '@/components/VideoGrid';
import StatCard from '@/components/StatCard';
import { Target, Trophy, Flame, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { VideoResponse } from '@/types/video';
import { searchVideos as searchVideosApi } from '@/services/videoApi';

// Mock data for demonstration
const mockStats = {
  totalPhrases: 156,
  videosCompleted: 23,
  currentStreak: 7,
};

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSearch = async (query: string, language: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchQuery(query);

    try {
      const response = await searchVideosApi(query, language);
      setVideos(response.videos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search videos';
      setError(errorMessage);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    // Video click is handled by VideoGrid component
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      {/* Auth Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <User size={16} />
                <span>{user.name}</span>
              </p>
              <p className="text-xs text-gray-500">Learning {user.learning_language}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-12">
          <h2 className="text-5xl font-bold mb-4 gradient-text">
            Master Languages Through Shadowing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn to speak like a native by shadowing real conversations and improving your pronunciation
          </p>
        </section>

        {/* Stats Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Phrases Practiced"
              value={mockStats.totalPhrases}
              icon={Target}
              gradient="from-indigo-500 to-purple-600"
            />
            <StatCard
              title="Videos Completed"
              value={mockStats.videosCompleted}
              icon={Trophy}
              gradient="from-purple-500 to-pink-600"
            />
            <StatCard
              title="Day Streak"
              value={mockStats.currentStreak}
              icon={Flame}
              gradient="from-orange-500 to-red-600"
            />
          </div>
        </section>

        {/* Search Section */}
        <section className="mb-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">
            Find Your Perfect Practice Video
          </h3>
          <VideoSearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            resultCount={videos.length}
            error={error}
          />
        </section>

        {/* Videos Section */}
        <section>
          <h3 className="text-2xl font-bold mb-6 text-gray-900">
            {hasSearched ? `Search Results${searchQuery ? ` for "${searchQuery}"` : ''}` : 'YouTube Videos'}
          </h3>

          {!hasSearched ? (
            <div className="text-center py-16 bg-white rounded-xl shadow">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-12 h-12 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search for Videos</h3>
                <p className="text-gray-600">
                  Use the search bar above to find YouTube videos to practice with.
                </p>
              </div>
            </div>
          ) : (
            <VideoGrid
              videos={videos}
              isLoading={isLoading}
              onVideoClick={handleVideoClick}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 ShadowSpeak. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
