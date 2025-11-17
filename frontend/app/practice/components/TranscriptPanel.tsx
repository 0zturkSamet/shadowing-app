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
  source?: "youtube" | "web_speech" | "cache" | "none";
  confidence?: number;
  autoScroll?: boolean;
}

export function TranscriptPanel({
  sentences,
  currentSentenceIndex,
  completedSentences,
  onSentenceClick,
  onMarkComplete,
  source = "none",
  confidence,
  autoScroll = true,
}: TranscriptPanelProps) {
  const currentSentenceRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current sentence (only if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll) {
      currentSentenceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSentenceIndex, autoScroll]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get source badge
  const getSourceBadge = () => {
    if (source === "cache") {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-shadowtube text-xs font-medium border border-green-200">
          💾 Cached
        </span>
      );
    }
    if (source === "youtube") {
      return (
        <span className="px-2 py-0.5 bg-youtube-red/10 text-youtube-red rounded-shadowtube text-xs font-medium border border-youtube-red/30">
          📺 YouTube
        </span>
      );
    }
    if (source === "web_speech") {
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-shadowtube text-xs font-medium border border-purple-200">
          🎤 Live
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-full shadowtube-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-secondary">Transcript</h3>
          {getSourceBadge()}
        </div>
        <p className="text-xs text-gray-600">
          {autoScroll ? '🔄 Auto-scroll ON' : '⏸️ Auto-scroll OFF'} • {sentences.length} phrases
          {confidence !== undefined && (
            <span className="ml-2 text-gray-500">
              • {Math.round(confidence * 100)}% confidence
            </span>
          )}
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
                group relative p-3 rounded-shadowtube cursor-pointer transition-all
                ${
                  isCurrentSentence
                    ? "bg-youtube-red/10 border-2 border-youtube-red shadow-lg"
                    : isFuture
                      ? "bg-gray-100 hover:bg-gray-150 text-gray-600 border border-transparent"
                      : isPast
                        ? "bg-gray-50 text-gray-400 opacity-70 border border-transparent"
                        : "border border-transparent"
                }
              `}
            >
              {/* Timestamp */}
              <div className="text-xs text-gray-500 mb-1">
                {formatTime(sentence.start_time)}
              </div>

              {/* Text - Current line highlighted in RED, others in black */}
              <p
                className={`
                  text-sm leading-relaxed
                  ${isCurrentSentence ? "text-youtube-red font-bold" : "text-black"}
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

              {/* Complete Checkbox - Always visible when completed */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete(sentence.sentence_id);
                }}
                className={`
                  absolute top-3 right-3 p-1 rounded-shadowtube
                  ${
                    isCompleted
                      ? "bg-green-600 text-white opacity-100"
                      : "bg-gray-200 text-gray-600 group-hover:bg-gray-300 opacity-0 group-hover:opacity-100"
                  }
                  transition-all duration-200
                `}
                title={isCompleted ? "Mark as incomplete" : "Mark as completed"}
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
