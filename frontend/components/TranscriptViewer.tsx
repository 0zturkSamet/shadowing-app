'use client';

import React, { useEffect, useRef } from 'react';
import { PhraseSchema, PracticeAttempt } from '@/types/video';
import { Clock, Eye, EyeOff } from 'lucide-react';

interface TranscriptViewerProps {
  phrases: PhraseSchema[];
  currentTime: number;
  currentPhraseIndex: number;
  onPhraseClick: (index: number, startTime: number) => void;
  practiceMode: boolean;
  practiceAttempts: Map<number, PracticeAttempt>;
  onRevealPhrase: (index: number) => void;
  currentLanguage: string;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  phrases,
  currentPhraseIndex,
  onPhraseClick,
  practiceMode,
  practiceAttempts,
  onRevealPhrase,
  currentLanguage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const phraseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to current phrase
  useEffect(() => {
    if (currentPhraseIndex >= 0 && phraseRefs.current[currentPhraseIndex]) {
      phraseRefs.current[currentPhraseIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentPhraseIndex]);

  // Format timestamp to MM:SS
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if phrase is revealed in practice mode
  const isPhraseRevealed = (index: number): boolean => {
    return practiceAttempts.get(index)?.revealed || false;
  };

  // Get attempt count for phrase
  const getAttemptCount = (index: number): number => {
    return practiceAttempts.get(index)?.attempts || 0;
  };

  if (phrases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No transcript available for this video.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {phrases.map((phrase, index) => {
        const isCurrent = index === currentPhraseIndex;
        const isRevealed = isPhraseRevealed(index);
        const attemptCount = getAttemptCount(index);
        const shouldHide = practiceMode && !isRevealed;

        return (
          <div
            key={index}
            ref={(el) => (phraseRefs.current[index] = el)}
            onClick={() => onPhraseClick(index, phrase.start_time)}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
              isCurrent
                ? 'bg-indigo-50 border-indigo-400 shadow-md scale-[1.02]'
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
            }`}
          >
            {/* Header with timestamp and phrase number */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{formatTimestamp(phrase.start_time)}</span>
                </div>
                <span className="text-xs text-gray-400">#{index + 1}</span>
              </div>

              {/* Practice mode indicators */}
              {practiceMode && (
                <div className="flex items-center space-x-2">
                  {attemptCount > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
                    </span>
                  )}
                  {isRevealed ? (
                    <Eye className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )}
            </div>

            {/* Phrase text */}
            <div className="relative">
              {shouldHide ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevealPhrase(index);
                  }}
                  className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <EyeOff className="w-5 h-5" />
                    <span className="font-medium">Click to reveal</span>
                  </div>
                </button>
              ) : (
                <p
                  className={`text-sm leading-relaxed ${
                    isCurrent ? 'text-gray-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  {phrase.text}
                </p>
              )}
            </div>

            {/* Practice mode hint */}
            {shouldHide && isCurrent && (
              <div className="mt-2 text-xs text-gray-500 italic">
                Try to speak the phrase before revealing it
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptViewer;
