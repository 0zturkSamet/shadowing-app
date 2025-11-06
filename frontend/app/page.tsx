'use client';

import Header from '@/components/Header';
import VideoSearch from '@/components/VideoSearch';
import VideoCard from '@/components/VideoCard';
import StatCard from '@/components/StatCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Target, Trophy, Flame, LogIn, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Video } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock data for demonstration
const mockStats = {
  totalPhrases: 156,
  videosCompleted: 23,
  currentStreak: 7,
};

const mockTrendingVideos: Video[] = [
  {
    id: '1',
    title: 'Daily English Conversation - Coffee Shop',
    description: 'Learn practical English phrases for ordering coffee and casual conversation',
    thumbnail_url: '',
    language: 'English',
    difficulty: 'beginner',
    duration: 180,
    view_count: 1250,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    title: 'Spanish Travel Phrases - Airport & Hotel',
    description: 'Essential Spanish vocabulary for travelers',
    thumbnail_url: '',
    language: 'Spanish',
    difficulty: 'intermediate',
    duration: 240,
    view_count: 890,
    created_at: '2024-01-14',
  },
  {
    id: '3',
    title: 'French Business Meeting Vocabulary',
    description: 'Professional French for business contexts',
    thumbnail_url: '',
    language: 'French',
    difficulty: 'advanced',
    duration: 300,
    view_count: 654,
    created_at: '2024-01-13',
  },
  {
    id: '4',
    title: 'German Pronunciation Guide',
    description: 'Master the challenging sounds of German',
    thumbnail_url: '',
    language: 'German',
    difficulty: 'beginner',
    duration: 210,
    view_count: 543,
    created_at: '2024-01-12',
  },
  {
    id: '5',
    title: 'Japanese Daily Greetings',
    description: 'Common Japanese greetings and polite expressions',
    thumbnail_url: '',
    language: 'Japanese',
    difficulty: 'beginner',
    duration: 150,
    view_count: 987,
    created_at: '2024-01-11',
  },
  {
    id: '6',
    title: 'Italian Restaurant Conversations',
    description: 'Order food and interact at Italian restaurants',
    thumbnail_url: '',
    language: 'Italian',
    difficulty: 'intermediate',
    duration: 195,
    view_count: 432,
    created_at: '2024-01-10',
  },
];

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSearch = async (query: string, language: string) => {
    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call
    setTimeout(() => {
      // Filter mock data based on search
      const filtered = mockTrendingVideos.filter((video) => {
        const matchesQuery = !query ||
          video.title.toLowerCase().includes(query.toLowerCase()) ||
          video.description.toLowerCase().includes(query.toLowerCase());
        const matchesLanguage = !language || video.language.toLowerCase() === language.toLowerCase();
        return matchesQuery && matchesLanguage;
      });
      setSearchResults(filtered);
      setIsSearching(false);
    }, 800);
  };

  const displayVideos = hasSearched ? searchResults : mockTrendingVideos;

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
          <VideoSearch
            onSearch={handleSearch}
            isLoading={isSearching}
            resultCount={displayVideos.length}
          />
        </section>

        {/* Videos Section */}
        <section>
          <h3 className="text-2xl font-bold mb-6 text-gray-900">
            {hasSearched ? 'Search Results' : 'Trending Videos'}
          </h3>

          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading videos...</p>
            </div>
          ) : displayVideos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow">
              <p className="text-gray-600 text-lg">No videos found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
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
