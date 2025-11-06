'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PhraseSelector from '@/components/PhraseSelector';
import { ArrowLeft, Mic, Play, Pause, RotateCcw } from 'lucide-react';
import { Phrase } from '@/types';

// Mock data
const mockPhrases: Phrase[] = [
  {
    id: '1',
    text: 'Good morning! How can I help you today?',
    start_time: 5,
    end_time: 8,
    difficulty: 'beginner',
    video_id: '1',
  },
  {
    id: '2',
    text: "I'd like to order a large cappuccino, please.",
    start_time: 10,
    end_time: 13,
    difficulty: 'beginner',
    video_id: '1',
  },
  {
    id: '3',
    text: 'Would you like that with regular or oat milk?',
    start_time: 15,
    end_time: 18,
    difficulty: 'intermediate',
    video_id: '1',
  },
  {
    id: '4',
    text: 'Regular milk is fine, and could I also get a croissant?',
    start_time: 20,
    end_time: 24,
    difficulty: 'intermediate',
    video_id: '1',
  },
  {
    id: '5',
    text: "Certainly! That'll be $8.50. Will that be cash or card?",
    start_time: 26,
    end_time: 30,
    difficulty: 'advanced',
    video_id: '1',
  },
];

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSelectPhrase = (phrase: Phrase) => {
    setSelectedPhrase(phrase);
    setScore(null);
    setIsRecording(false);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    // TODO: Implement recording logic
    if (!isRecording) {
      // Simulate scoring after recording
      setTimeout(() => {
        setScore(Math.floor(Math.random() * 30) + 70); // Random score 70-100
        setIsRecording(false);
      }, 3000);
    }
  };

  const handlePlayPhrase = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement audio playback
    if (!isPlaying) {
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
    }
  };

  const handleRetry = () => {
    setScore(null);
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Video Placeholder */}
              <div className="bg-gradient-to-br from-indigo-400 to-purple-500 aspect-video flex items-center justify-center">
                <Play className="w-24 h-24 text-white/80" />
              </div>

              {/* Video Controls */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Daily English Conversation - Coffee Shop
                </h2>

                {selectedPhrase && (
                  <div className="space-y-4">
                    {/* Selected Phrase Display */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <p className="text-sm text-indigo-600 font-medium mb-2">Selected Phrase:</p>
                      <p className="text-lg text-gray-900">{selectedPhrase.text}</p>
                    </div>

                    {/* Playback Button */}
                    <button
                      onClick={handlePlayPhrase}
                      className={`w-full py-3 rounded-lg font-medium transition-all ${
                        isPlaying
                          ? 'bg-gray-600 hover:bg-gray-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } text-white flex items-center justify-center space-x-2`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-5 h-5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          <span>Play Phrase</span>
                        </>
                      )}
                    </button>

                    {/* Recording Button */}
                    <button
                      onClick={handleRecord}
                      disabled={isPlaying}
                      className={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-3 ${
                        isRecording
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Mic className="w-6 h-6" />
                      <span className="text-lg">
                        {isRecording ? 'Recording...' : 'Start Recording'}
                      </span>
                    </button>

                    {/* Score Display */}
                    {score !== null && (
                      <div className="bg-white border-2 border-emerald-200 rounded-lg p-6 text-center">
                        <p className="text-gray-600 mb-2">Your Score</p>
                        <p className="text-5xl font-bold text-emerald-600 mb-4">{score}%</p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleRetry}
                            className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Try Again</span>
                          </button>
                          <button
                            onClick={() => {
                              const currentIndex = mockPhrases.findIndex(p => p.id === selectedPhrase.id);
                              if (currentIndex < mockPhrases.length - 1) {
                                setSelectedPhrase(mockPhrases[currentIndex + 1]);
                                setScore(null);
                              }
                            }}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Next Phrase
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!selectedPhrase && (
                  <div className="text-center py-8 text-gray-500">
                    Select a phrase from the list to start practicing
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Phrase Selector Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <PhraseSelector
                phrases={mockPhrases}
                selectedPhraseId={selectedPhrase?.id}
                onSelectPhrase={handleSelectPhrase}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
