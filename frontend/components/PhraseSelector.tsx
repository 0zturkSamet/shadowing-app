'use client';

import { Phrase } from '@/types';
import { Check } from 'lucide-react';

interface PhraseSelectorProps {
  phrases: Phrase[];
  selectedPhraseId?: string;
  onSelectPhrase: (phrase: Phrase) => void;
}

export default function PhraseSelector({
  phrases,
  selectedPhraseId,
  onSelectPhrase
}: PhraseSelectorProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select a Phrase to Practice
      </h3>

      <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
        {phrases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No phrases available
          </div>
        ) : (
          phrases.map((phrase) => (
            <button
              key={phrase.id}
              onClick={() => onSelectPhrase(phrase)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedPhraseId === phrase.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium mb-2 line-clamp-2">
                    {phrase.text}
                  </p>

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      {formatTime(phrase.start_time)} - {formatTime(phrase.end_time)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(phrase.difficulty)}`}>
                      {phrase.difficulty}
                    </span>
                  </div>
                </div>

                {selectedPhraseId === phrase.id && (
                  <div className="flex-shrink-0 bg-indigo-600 text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
