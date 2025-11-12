'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { Target, Trophy, Flame, LogOut, User, Link as LinkIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

// Mock data for demonstration
const mockStats = {
  totalPhrases: 156,
  videosCompleted: 23,
  currentStreak: 7,
};

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);

      // Handle youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }

      // Handle youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }

      // Handle youtube.com/embed/VIDEO_ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2];
      }

      // Handle youtube.com/v/VIDEO_ID
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/v/')) {
        return urlObj.pathname.split('/')[2];
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const videoId = extractVideoId(url.trim());

    if (!videoId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube video URL.');
      return;
    }

    setIsProcessing(true);
    // Navigate to practice page with the video ID
    router.push(`/practice/${videoId}`);
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
            Paste any YouTube video URL and practice speaking like a native by shadowing real conversations
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

        {/* URL Paste Section */}
        <section className="mb-12 bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center mb-6">
            <LinkIcon className="w-6 h-6 text-indigo-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">
              Start Practicing with Any YouTube Video
            </h3>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Video URL
              </label>
              <input
                id="youtube-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
                disabled={isProcessing}
              />
              <p className="mt-2 text-sm text-gray-500">
                Paste any YouTube video URL to start practicing
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  <span>Start Practice</span>
                </>
              )}
            </button>
          </form>

          {/* Example URLs */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Supported URL formats:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>• https://youtu.be/VIDEO_ID</li>
              <li>• https://www.youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
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
