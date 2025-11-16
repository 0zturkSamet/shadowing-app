'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  // Landing Page (Logged Out) - Wireframe Style
  if (!user) {
    const wireframeExamples = [
      {
        image: 'https://images.unsplash.com/photo-1668608322390-46344f213ce9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBzcGVha2luZyUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzYzMzA4NzA5fDA&ixlib=rb-4.1.0&q=80&w=1080',
        caption: 'Start your journey'
      },
      {
        image: 'https://images.unsplash.com/photo-1758797316165-986ec92e7ad2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYW5ndWFnZSUyMGxlYXJuaW5nJTIwcHJhY3RpY2V8ZW58MXx8fHwxNzYzMzA4NzA5fDA&ixlib=rb-4.1.0&q=80&w=1080',
        caption: 'Consistency creates fluency'
      },
      {
        image: 'https://images.unsplash.com/photo-1614492898637-435e0f87cef8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmclMjB2aWRlb3xlbnwxfHx8fDE3NjMzMDg3MTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
        caption: 'Shadow daily, improve instantly'
      }
    ];

    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Hero Section */}
            <div className="text-center mb-20">
              <h1 className="text-black mb-6 max-w-4xl mx-auto text-4xl md:text-5xl lg:text-6xl font-bold">
                Practice Shadowing. Improve Speaking. Master Any Video.
              </h1>
              <p className="text-gray-600 mb-12 max-w-2xl mx-auto text-lg md:text-xl">
                Paste any YouTube link and shadow effortlessly with auto-scroll transcripts.
              </p>
            </div>

            {/* Example Videos Section */}
            <div className="mb-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {wireframeExamples.map((example, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={example.image}
                        alt={example.caption}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 text-center">
                      <p className="text-gray-800">{example.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-block px-8 py-4 bg-[#FF0000] text-white rounded-full hover:bg-[#CC0000] transition-all transform hover:scale-105 shadow-lg"
              >
                Sign in with Google to start
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Main Interface (Logged In) - Wireframe Style
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-gray-800 mb-6 text-2xl md:text-3xl font-bold text-center">
              Start Your Shadowing Practice
            </h2>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your YouTube link here"
              className="w-full px-6 py-4 border-2 border-gray-200 rounded-full mb-6 focus:outline-none focus:border-[#FF0000] transition-colors"
              disabled={isProcessing}
            />
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
                <p className="text-sm text-red-600 font-medium text-center">{error}</p>
              </div>
            )}
            <button
              onClick={handleUrlSubmit}
              disabled={isProcessing || !url.trim()}
              className="w-full px-8 py-4 bg-[#FF0000] text-white rounded-full hover:bg-[#CC0000] transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isProcessing ? 'Loading...' : 'Start Shadowing'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
