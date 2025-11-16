'use client';

import { useState, useEffect } from 'react';
import { Play, Clock, ChevronRight, Flame, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Mock stats data
const mockStats = {
  totalMinutes: 342,
  videosCompleted: 18,
  currentStreak: 7,
};

// Mock recent activity data
const mockRecentActivity = [
  {
    id: '1',
    title: '800+ hours of Learning Claude Code in 8 minutes',
    videoId: 'ZaUEf2C4fKQ',
    thumbnail: 'https://img.youtube.com/vi/ZaUEf2C4fKQ/mqdefault.jpg',
    duration: '45 min',
    lastPracticed: '2 hours ago',
  },
  {
    id: '2',
    title: 'Spanish Conversation Practice - Coffee Shop',
    videoId: 'abc123',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '30 min',
    lastPracticed: 'Yesterday',
  },
  {
    id: '3',
    title: 'German Grammar Basics',
    videoId: 'def456',
    thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
    duration: '25 min',
    lastPracticed: '2 days ago',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

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

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-2">Dashboard</h1>
          <p className="text-gray-600 text-lg">Track your progress and achievements</p>
        </div>

        {/* Stats Overview - Rounded Badges */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Total Minutes Practiced - Large Circular Badge */}
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-youtube-red to-primary-700 flex items-center justify-center shadow-2xl">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white mb-1">
                      {mockStats.totalMinutes}
                    </div>
                    <div className="text-sm uppercase tracking-wide text-white/90 font-semibold">
                      Minutes
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-secondary">Total Minutes Practiced</h3>
            </div>

            {/* Videos Completed - Circular Badge */}
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-secondary to-gray-700 flex items-center justify-center shadow-2xl">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white mb-1">
                      {mockStats.videosCompleted}
                    </div>
                    <div className="text-sm uppercase tracking-wide text-white/90 font-semibold">
                      Videos
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-secondary">Videos Completed</h3>
            </div>

            {/* Current Streak - Circular Badge with Flame */}
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl">
                  <div className="text-center">
                    <Flame className="w-12 h-12 text-white mx-auto mb-2" />
                    <div className="text-5xl font-bold text-white mb-1">
                      {mockStats.currentStreak}
                    </div>
                    <div className="text-sm uppercase tracking-wide text-white/90 font-semibold">
                      Days
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-secondary">Current Streak</h3>
            </div>
          </div>
        </section>

        {/* Activity List */}
        <section className="max-w-4xl mx-auto">
          <div className="shadowtube-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-youtube-red" />
                <h2 className="text-2xl font-bold text-secondary">Recent Activity</h2>
              </div>
              <p className="text-gray-600 mt-1">
                Your recently shadowed videos
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {mockRecentActivity.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => router.push(`/practice?v=${activity.videoId}`)}
                  className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left group flex items-center gap-4"
                >
                  {/* Thumbnail */}
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={activity.thumbnail}
                      alt={activity.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Play className="w-8 h-8 text-white opacity-80" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-secondary group-hover:text-youtube-red transition-colors line-clamp-2">
                      {activity.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {activity.duration}
                      </span>
                      <span>•</span>
                      <span>{activity.lastPracticed}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-youtube-red transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {mockRecentActivity.length === 0 && (
            <div className="shadowtube-card p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No activity yet</h3>
              <p className="text-gray-500 mb-6">
                Start practicing to see your progress here
              </p>
              <button
                onClick={() => router.push('/')}
                className="shadowtube-button-primary px-8 py-3"
              >
                Start Practicing
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
