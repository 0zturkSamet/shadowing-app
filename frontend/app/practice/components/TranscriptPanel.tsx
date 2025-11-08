"use client";

import React, { useEffect, useRef } from "react";
import { TranscriptSentence } from "@/lib/types/transcript";
import { Check } from "lucide-react";

interface TranscriptPanelProps {
  sentences: TranscriptSentence[];
  currentSentenceIndex: number;
  completedSentences: Set<number>;
  onSentenceClick: (sentenceIndex: number) => void;
  onMarkComplete: (sentenceId: number) => void;
}

export function TranscriptPanel({
  sentences,
  currentSentenceIndex,
  completedSentences,
  onSentenceClick,
  onMarkComplete,
}: TranscriptPanelProps) {
  const currentSentenceRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current sentence
  useEffect(() => {
    currentSentenceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentSentenceIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">Transcript</h3>
        <p className="text-xs text-gray-400 mt-1">
          Click segment • Auto-scroll • {sentences.length} phrases
        </p>
      </div>

      {/* Sentences */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {sentences.map((sentence, index) => {
          const isCurrentSentence = index === currentSentenceIndex;
          const isCompleted = completedSentences.has(sentence.sentence_id);
          const isFuture = index > currentSentenceIndex;
          const isPast = index < currentSentenceIndex;

          return (
            <div
              key={sentence.sentence_id}
              ref={isCurrentSentence ? currentSentenceRef : null}
              onClick={() => onSentenceClick(index)}
              className={`
                group relative p-3 rounded-lg cursor-pointer transition-all
                ${
                  isCurrentSentence
                    ? "bg-blue-600/30 border border-blue-500 shadow-lg"
                    : isFuture
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-400"
                      : isPast
                        ? "bg-gray-800/50 text-gray-500 opacity-70"
                        : ""
                }
              `}
            >
              {/* Timestamp */}
              <div className="text-xs text-gray-400 mb-1">
                {formatTime(sentence.start_time)}
              </div>

              {/* Text */}
              <p
                className={`
                  text-sm leading-relaxed
                  ${isCurrentSentence ? "text-white font-medium" : "text-gray-300"}
                `}
              >
                {sentence.text}
              </p>

              {/* Confidence Score (if available) */}
              {sentence.confidence && (
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round(sentence.confidence * 100)}%
                </div>
              )}

              {/* Complete Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete(sentence.sentence_id);
                }}
                className={`
                  absolute top-3 right-3 p-1 rounded
                  ${
                    isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-400 group-hover:bg-gray-600"
                  }
                  transition-colors opacity-0 group-hover:opacity-100
                `}
                title="Mark as completed"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
