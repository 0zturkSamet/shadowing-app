'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StatCard from '@/components/StatCard';
import { Target, Trophy, Flame, Play, Link as LinkIcon, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BRAND, MOTIVATIONAL_QUOTES } from '@/lib/constants/branding';
import Image from 'next/image';

// Mock data for demonstration
const mockStats = {
  totalPhrases: 156,
  videosCompleted: 23,
  currentStreak: 7,
};

// Example videos for landing page
const exampleVideos = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'English Conversation Practice',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    motivation: MOTIVATIONAL_QUOTES[0],
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Learn Spanish Naturally',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
    motivation: MOTIVATIONAL_QUOTES[1],
  },
  {
    id: '9bZkp7q19f0',
    title: 'Master French Pronunciation',
    thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    motivation: MOTIVATIONAL_QUOTES[2],
  },
];

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    router.push(`/practice?v=${videoId}`);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-youtube-red mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Landing Page (Logged Out)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-white via-red-50/20 to-gray-50 py-20 px-4">
            <div className="container mx-auto max-w-5xl text-center">
              <div className="mb-6 flex justify-center">
                <Sparkles className="w-16 h-16 text-youtube-red" />
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-secondary">
                {BRAND.tagline.split('. ').map((part, i) => (
                  <span key={i}>
                    {i === 0 ? (
                      <span className="gradient-text">{part}.</span>
                    ) : (
                      <span> {part}.</span>
                    )}
                  </span>
                ))}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
                {BRAND.description}
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center space-x-3 shadowtube-button-primary px-10 py-4 text-lg"
              >
                <Play className="w-6 h-6" />
                <span>Sign in with Google to start</span>
              </Link>
            </div>
          </section>

          {/* Example Videos Section */}
          <section className="py-16 px-4 bg-white">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-secondary">
                Start Your Journey Today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {exampleVideos.map((video, index) => (
                  <div
                    key={index}
                    className="shadowtube-card card-hover overflow-hidden group"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <Play className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-lg mb-2 text-secondary line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-youtube-red font-medium italic">
                        "{video.motivation}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  href="/auth/login"
                  className="shadowtube-button-outline px-8 py-3"
                >
                  Get Started Now
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  // Main Interface (Logged In)
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Welcome Message */}
        <section className="text-center py-8 mb-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-secondary">
            Welcome back, <span className="gradient-text">{user.name}</span>!
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ready to continue your language learning journey?
          </p>
        </section>

        {/* Stats Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Minutes Practiced"
              value={mockStats.totalPhrases}
              icon={Target}
              gradient="from-youtube-red to-primary-700"
            />
            <StatCard
              title="Videos Completed"
              value={mockStats.videosCompleted}
              icon={Trophy}
              gradient="from-secondary to-gray-700"
            />
            <StatCard
              title="Current Streak"
              value={mockStats.currentStreak}
              icon={Flame}
              gradient="from-orange-500 to-red-600"
            />
          </div>
        </section>

        {/* YouTube Input Section */}
        <section className="mb-12 shadowtube-card p-8 max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <LinkIcon className="w-6 h-6 text-youtube-red mr-3" />
            <h3 className="text-2xl font-bold text-secondary">
              Paste your YouTube link here
            </h3>
          </div>

          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <input
                id="youtube-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-shadowtube focus:ring-2 focus:ring-youtube-red focus:border-youtube-red outline-none transition-all duration-200"
                disabled={isProcessing}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-shadowtube">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="w-full shadowtube-button-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Start Shadowing</span>
                </>
              )}
            </button>
          </form>

          {/* Example URLs */}
          <div className="mt-6 p-4 bg-gray-50 rounded-shadowtube">
            <p className="text-sm font-medium text-gray-700 mb-2">Supported URL formats:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>• https://youtu.be/VIDEO_ID</li>
              <li>• https://www.youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
