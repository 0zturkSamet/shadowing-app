'use client';

import { useEffect } from 'react';
import { Play, Clock, Flame } from 'lucide-react';
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

// Example video (working with cached Whisper transcript)
const exampleVideos = [
  {
    id: 'example-1',
    title: '800+ hours of Learning Claude Code in 8 minutes',
    videoId: 'ZaUEf2C4fKQ',
    thumbnail: 'https://img.youtube.com/vi/ZaUEf2C4fKQ/mqdefault.jpg',
    duration: '8 min',
    lastPracticed: 'Try this demo video',
    language: 'English',
    isExample: true,
  },
];

// Mock recent activity data
const mockRecentActivity: any[] = [];

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

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-gray-800 mb-12 text-3xl md:text-4xl font-bold">Your Progress</h1>

          {/* Stats Overview - Wireframe Style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Total Minutes */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-[#FF0000] bg-opacity-10 rounded-full flex items-center justify-center">
                <Clock className="w-10 h-10 text-[#FF0000]" />
              </div>
              <p className="text-gray-600 mb-2">Total Minutes Practiced</p>
              <p className="text-gray-900 text-3xl font-bold">{mockStats.totalMinutes}</p>
            </div>

            {/* Videos Completed */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-[#FF0000] bg-opacity-10 rounded-full flex items-center justify-center">
                <Play className="w-10 h-10 text-[#FF0000]" />
              </div>
              <p className="text-gray-600 mb-2">Videos Completed</p>
              <p className="text-gray-900 text-3xl font-bold">{mockStats.videosCompleted}</p>
            </div>

            {/* Current Streak */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-[#FF0000] bg-opacity-10 rounded-full flex items-center justify-center">
                <Flame className="w-10 h-10 text-[#FF0000]" />
              </div>
              <p className="text-gray-600 mb-2">Current Streak</p>
              <p className="text-gray-900 text-3xl font-bold">
                {mockStats.currentStreak} {mockStats.currentStreak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>

          {/* Activity List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-800 mb-6 text-xl font-bold">
              {mockRecentActivity.length === 0 ? 'Example Videos to Try' : 'Recent Activity'}
            </h2>

            {mockRecentActivity.length === 0 ? (
              <>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>👋 New here?</strong> Try these example videos to get started with shadowing practice!
                  </p>
                </div>
                <div className="space-y-4">
                  {exampleVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border-2 border-youtube-red/20 hover:border-youtube-red"
                      onClick={() => router.push(`/practice?v=${video.videoId}`)}
                    >
                      <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-800 truncate mb-1 font-semibold">{video.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {video.duration}
                          </span>
                          <span>•</span>
                          <span className="text-youtube-red font-medium">{video.lastPracticed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/practice?v=${activity.videoId}`)}
                  >
                    <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={activity.thumbnail}
                        alt={activity.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-800 truncate mb-1 font-semibold">{activity.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {activity.duration}
                        </span>
                        <span>•</span>
                        <span>{activity.lastPracticed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
