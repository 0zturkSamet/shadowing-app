'use client';

import React from 'react';
import { PracticeAttempt } from '@/types/video';
import { BookOpen, Eye, Target, Trophy, TrendingUp } from 'lucide-react';

interface PracticeModeProps {
  practiceMode: boolean;
  onTogglePracticeMode: () => void;
  practiceAttempts: Map<number, PracticeAttempt>;
  totalPhrases: number;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({
  practiceMode,
  onTogglePracticeMode,
  practiceAttempts,
  totalPhrases,
}) => {
  // Calculate statistics
  const totalAttempts = Array.from(practiceAttempts.values()).reduce(
    (sum, attempt) => sum + attempt.attempts,
    0
  );
  const revealedCount = Array.from(practiceAttempts.values()).filter(
    (attempt) => attempt.revealed
  ).length;
  const completionRate = totalPhrases > 0 ? (revealedCount / totalPhrases) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Practice Mode</h3>
            <p className="text-sm text-gray-500">Test your listening comprehension</p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onTogglePracticeMode}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            practiceMode
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {practiceMode ? 'Exit Practice' : 'Start Practice'}
        </button>
      </div>

      {/* Description */}
      <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-sm text-indigo-900 leading-relaxed">
          {practiceMode ? (
            <>
              <strong>Practice Mode Active:</strong> Phrases are hidden by default. Try to speak
              or understand each phrase before revealing it. This helps improve your listening
              comprehension and speaking skills.
            </>
          ) : (
            <>
              <strong>How it works:</strong> In practice mode, transcript phrases are hidden. Try
              to understand and speak each phrase before revealing it to check your comprehension.
            </>
          )}
        </p>
      </div>

      {/* Statistics */}
      {practiceMode && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Session Statistics
          </h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Revealed phrases */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-900">{revealedCount}</span>
              </div>
              <p className="text-sm text-blue-700">Phrases Revealed</p>
            </div>

            {/* Total attempts */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-900">{totalAttempts}</span>
              </div>
              <p className="text-sm text-purple-700">Total Attempts</p>
            </div>

            {/* Completion rate */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-900">
                  {completionRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm text-green-700">Completion</p>
            </div>

            {/* Remaining */}
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold text-orange-900">
                  {totalPhrases - revealedCount}
                </span>
              </div>
              <p className="text-sm text-orange-700">Remaining</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium text-gray-900">
                {revealedCount} / {totalPhrases}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="text-sm font-semibold text-yellow-900 mb-2">💡 Practice Tips</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Listen to the phrase first without revealing it</li>
              <li>• Try to repeat what you heard out loud</li>
              <li>• Click to reveal and check your comprehension</li>
              <li>• Replay difficult phrases to improve</li>
            </ul>
          </div>
        </div>
      )}

      {/* Benefits (when not in practice mode) */}
      {!practiceMode && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Benefits
          </h4>
          <ul className="space-y-2">
            {[
              'Improve listening comprehension',
              'Practice speaking naturally',
              'Build vocabulary retention',
              'Track your progress',
            ].map((benefit, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="mt-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PracticeMode;
