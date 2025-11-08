'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/VideoPlayer';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { NoContentPanel } from '@/components/NoContentPanel';
import { useAuth } from '@/hooks/useAuth';

interface TranscriptResponse {
  status: "success" | "no_content" | "error";
  source?: "transcript" | "captions" | "auto_captions";
  quality?: "best" | "good" | "acceptable";
  phrases?: Array<{
    text: string;
    start_time: number;
    duration: number;
  }>;
  warning?: string;
  is_auto_generated?: boolean;
  message?: string;
  suggestion?: string;
}

// Assembly AI response format
interface AssemblyAIResponse {
  video_id: string;
  title?: string;
  transcript: Array<{
    sentence_id: number;
    text: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }>;
  source: "assembly_ai";
  cached: boolean;
  cached_at: string;
  processing_time: number;
  language: string;
  audio_duration?: number;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const videoId = params.id as string;

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<
    "transcript" | "captions" | "auto_captions" | null
  >(null);
  const [transcriptWarning, setTranscriptWarning] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);

  // Fetch transcript/captions on mount
  useEffect(() => {
    const fetchContent = async () => {
      if (!token) {
        router.push('/auth/login');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/videos/transcripts/${videoId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          router.push('/auth/login');
          return;
        }

        // Check if response is OK
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const data: AssemblyAIResponse = await response.json();

        // Transform Assembly AI response to expected format
        if (data.transcript && data.transcript.length > 0) {
          // Content available
          setHasContent(true);
          setTranscriptSource("transcript"); // Assembly AI provides high-quality transcripts
          setTranscriptWarning(null);

          // Transform transcript to phrases format
          const transformedPhrases = data.transcript.map(item => ({
            text: item.text,
            start_time: item.start_time,
            duration: item.end_time - item.start_time
          }));

          setPhrases(transformedPhrases);
        } else {
          // No content available
          setHasContent(false);
        }
      } catch (err) {
        console.error('Error fetching transcript:', err);
        setError(`Failed to load practice content: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setHasContent(false);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [videoId, token, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading practice session...</p>
      </div>
    );
  }

  // No content state
  if (!hasContent) {
    return <NoContentPanel videoId={videoId} />;
  }

  // Main practice page layout
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Video player on left (60%) */}
      <div className="w-3/5 flex flex-col p-4 gap-4">
        <VideoPlayer
          videoId={videoId}
          phrases={phrases}
          onPhraseClick={(index, startTime) => {
            setCurrentTime(startTime);
          }}
          onProgressUpdate={(timestamp) => {
            // Progress update handling can be added here if needed
          }}
          isPlaying={false}
          currentTime={currentTime}
          playbackSpeed={1}
          volume={100}
          isMuted={false}
          onPlay={() => {}}
          onPause={() => {}}
          onTimeUpdate={setCurrentTime}
          onDurationChange={() => {}}
          onSeek={setCurrentTime}
        />
      </div>

      {/* Transcript/captions on right (40%) */}
      <div className="w-2/5 p-4 bg-gray-100">
        <TranscriptViewer
          phrases={phrases}
          currentTime={currentTime}
          source={transcriptSource}
          isAutoGenerated={transcriptSource === "auto_captions"}
          warning={transcriptWarning || undefined}
          onPhraseClick={(index, startTime) => {
            // Handle phrase click - jump video to timestamp
            setCurrentTime(startTime);
          }}
          practiceMode={practiceMode}
          onPracticeToggle={() => setPracticeMode(!practiceMode)}
        />
      </div>
    </div>
  );
}
