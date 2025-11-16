'use client';

import { useState } from 'react';
import { Play, Search, Clock, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from "lucide-react";

// Mock recent activity data
const mockRecentActivity = [
  {
    id: '1',
    title: '800+ hours of Learning Claude Code in 8 minutes',
    videoId: 'ZaUEf2C4fKQ',
    type: 'transcript',
    date: '2 minutes ago',
  },
  {
    id: '2',
    title: 'Spanish Conversation Practice - Coffee Shop',
    videoId: 'abc123',
    type: 'transcript',
    date: '11/8/2025',
  },
  {
    id: '3',
    title: 'German Grammar Basics',
    videoId: 'def456',
    type: 'transcript',
    date: '11/7/2025',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [videoUrl, setVideoUrl] = useState('');

  const handleStartPractice = () => {
    if (videoUrl.trim()) {
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeId(videoUrl);
      if (videoId) {
        router.push(`/practice?v=${videoId}`);
      }
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header with theme toggle */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ShadowSpeak</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Start Practice Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-600/20 rounded-lg">
                <Play className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Practice</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Start shadowing with any YouTube video
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartPractice()}
                placeholder="Paste YouTube URL or video ID"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600"
              />
              <button
                onClick={handleStartPractice}
                disabled={!videoUrl.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Start Practice
              </button>
            </div>
          </div>

          {/* Browse Videos Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Search className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Browse</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Discover curated videos for language learning
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Browse Videos
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent activity</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your latest practice sessions
            </p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {mockRecentActivity.map((activity) => (
              <button
                key={activity.id}
                onClick={() => router.push(`/practice?v=${activity.videoId}`)}
                className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {activity.type}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 ml-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Empty state hint */}
        {mockRecentActivity.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start practicing to see your activity here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
