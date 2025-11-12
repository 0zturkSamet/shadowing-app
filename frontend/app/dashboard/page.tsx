'use client';

import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { Target, Trophy, Flame, TrendingUp, Award, Clock } from 'lucide-react';
import Link from 'next/link';

// Mock data
const mockUserProgress = {
  totalPhrasesPracticed: 156,
  totalVideosCompleted: 23,
  averageScore: 87,
  currentStreak: 7,
  bestStreak: 14,
  totalPracticeTime: 4320, // in minutes
  level: 'Intermediate',
};

const mockRecentVideos = [
  {
    id: '1',
    title: 'Daily English Conversation - Coffee Shop',
    language: 'English',
    completedAt: '2024-01-15',
    score: 92,
  },
  {
    id: '2',
    title: 'Spanish Travel Phrases',
    language: 'Spanish',
    completedAt: '2024-01-14',
    score: 85,
  },
  {
    id: '3',
    title: 'French Business Meeting',
    language: 'French',
    completedAt: '2024-01-13',
    score: 78,
  },
];

const mockAchievements = [
  { name: 'First Steps', description: 'Complete your first practice session', earned: true },
  { name: '7-Day Streak', description: 'Practice for 7 days in a row', earned: true },
  { name: 'Perfect Score', description: 'Get 100% on any phrase', earned: false },
  { name: 'Polyglot', description: 'Practice in 3 different languages', earned: true },
  { name: '100 Phrases', description: 'Practice 100 phrases', earned: true },
  { name: '14-Day Streak', description: 'Practice for 14 days in a row', earned: false },
];

export default function DashboardPage() {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Your Dashboard</h1>
          <p className="text-gray-600">Track your progress and achievements</p>
        </div>

        {/* Stats Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Phrases Practiced"
              value={mockUserProgress.totalPhrasesPracticed}
              icon={Target}
              gradient="from-indigo-500 to-purple-600"
            />
            <StatCard
              title="Videos Completed"
              value={mockUserProgress.totalVideosCompleted}
              icon={Trophy}
              gradient="from-purple-500 to-pink-600"
            />
            <StatCard
              title="Current Streak"
              value={mockUserProgress.currentStreak}
              icon={Flame}
              gradient="from-orange-500 to-red-600"
            />
            <StatCard
              title="Average Score"
              value={`${mockUserProgress.averageScore}%`}
              icon={TrendingUp}
              gradient="from-emerald-500 to-teal-600"
            />
            <StatCard
              title="Best Streak"
              value={mockUserProgress.bestStreak}
              icon={Award}
              gradient="from-yellow-500 to-orange-600"
            />
            <StatCard
              title="Practice Time"
              value={formatTime(mockUserProgress.totalPracticeTime)}
              icon={Clock}
              gradient="from-blue-500 to-indigo-600"
            />
          </div>
        </section>

        {/* Progress Chart Placeholder */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Over Time</h2>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-12 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Progress chart coming soon</p>
                <p className="text-gray-500 text-sm mt-2">
                  Track your daily practice and score improvements
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Videos */}
          <section>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Practice</h2>
              <div className="space-y-4">
                {mockRecentVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <Link href={`/practice?v=${video.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                          {video.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">{video.language}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{video.completedAt}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        video.score >= 90 ? 'text-emerald-600' :
                        video.score >= 75 ? 'text-yellow-600' :
                        'text-orange-600'
                      }`}>
                        {video.score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/">
                <button className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all">
                  Find More Videos
                </button>
              </Link>
            </div>
          </section>

          {/* Achievements */}
          <section>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Achievements</h2>
              <div className="space-y-3">
                {mockAchievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      achievement.earned
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        achievement.earned ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}>
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          achievement.earned ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {achievement.name}
                        </h3>
                        <p className={`text-sm ${
                          achievement.earned ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
