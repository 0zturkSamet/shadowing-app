'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, FileText, Video } from 'lucide-react';

interface NoContentPanelProps {
  videoId: string;
}

export function NoContentPanel({ videoId }: NoContentPanelProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </button>

        {/* No Content Card */}
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-8 border-b border-orange-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-12 h-12 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  No Content Available
                </h2>
                <p className="text-gray-600">
                  This video doesn't have any transcripts or captions available for practice.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <div className="space-y-4">
              {/* What this means */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  What this means
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  We couldn't find any of the following for this video:
                </p>
                <ul className="mt-2 space-y-1 text-gray-700 ml-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">•</span>
                    Official transcript
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blue-600">•</span>
                    Official captions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-600">•</span>
                    Auto-generated captions
                  </li>
                </ul>
              </div>

              {/* Why this happens */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Why does this happen?
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Some video creators don't enable captions for their videos, or the video might be too new for auto-generated captions to be available. This is determined by YouTube's settings for the video.
                </p>
              </div>

              {/* What to do next */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-600" />
                  What can you do?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <p className="font-medium text-gray-900">Try a different video</p>
                      <p className="text-sm text-gray-600">
                        Most popular educational videos have captions or transcripts available.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="text-2xl">💡</span>
                    <div>
                      <p className="font-medium text-gray-900">Look for videos with "CC" badge</p>
                      <p className="text-sm text-gray-600">
                        These videos are more likely to have high-quality captions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Find Another Video
              </button>
              <button
                onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
              >
                Watch on YouTube
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoContentPanel;
