import { TranscriptSentence } from "@/lib/types/transcript";

/**
 * Progress callback for transcription updates
 */
export interface TranscriptionProgress {
  status: "extracting" | "transcribing" | "processing" | "completed" | "error";
  currentSentence?: number;
  totalSentences?: number;
  message: string;
  percentage?: number;
}

/**
 * Error types for better error handling
 */
export class WebSpeechError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_SUPPORTED"
      | "PERMISSION_DENIED"
      | "AUDIO_FAILED"
      | "NETWORK_ERROR"
      | "TRANSCRIPTION_FAILED"
      | "NO_SPEECH"
  ) {
    super(message);
    this.name = "WebSpeechError";
  }
}

/**
 * Configuration options for Web Speech transcription
 */
export interface WebSpeechConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  chunkDuration?: number; // seconds
}

/**
 * Check if Web Speech API is supported in the current browser
 */
export function isWebSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
}

/**
 * Get supported languages for Web Speech API
 */
export function getSupportedLanguages(): string[] {
  return [
    "en-US",
    "en-GB",
    "es-ES",
    "es-MX",
    "fr-FR",
    "de-DE",
    "it-IT",
    "ja-JP",
    "ko-KR",
    "pt-BR",
    "pt-PT",
    "ru-RU",
    "zh-CN",
    "zh-TW",
    "ar-SA",
    "hi-IN",
    "nl-NL",
    "pl-PL",
    "tr-TR",
  ];
}

/**
 * Extract audio from YouTube video element
 * This captures the audio stream from the playing video
 */
export async function extractAudioFromYouTube(
  videoElement: HTMLVideoElement
): Promise<MediaStream> {
  try {
    console.log("[WebSpeech] Extracting audio from YouTube video element");

    // Create audio context
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Create media element source
    const source = audioContext.createMediaElementSource(videoElement);

    // Create destination for capturing
    const destination = audioContext.createMediaStreamDestination();

    // Connect source to destination
    source.connect(destination);
    source.connect(audioContext.destination); // Also connect to speakers

    console.log("[WebSpeech] Audio stream created successfully");
    return destination.stream;
  } catch (error) {
    console.error("[WebSpeech] Failed to extract audio:", error);
    throw new WebSpeechError(
      "Failed to extract audio from video. Please ensure the video is playing.",
      "AUDIO_FAILED"
    );
  }
}

/**
 * Parse transcript text into sentences
 * Detects sentence boundaries and splits accordingly
 */
function parseSentences(text: string): string[] {
  // Split by sentence-ending punctuation, preserving the punctuation
  const sentences = text
    .split(/([.!?]+\s+)/)
    .reduce((acc: string[], part, idx, arr) => {
      if (idx % 2 === 0 && part.trim()) {
        const nextPart = arr[idx + 1] || "";
        acc.push((part + nextPart).trim());
      }
      return acc;
    }, []);

  return sentences.filter((s) => s.length > 0);
}

/**
 * Create SpeechRecognition instance
 */
function createSpeechRecognition(
  config: WebSpeechConfig
): SpeechRecognition {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.continuous = config.continuous ?? true;
  recognition.interimResults = config.interimResults ?? true;
  recognition.maxAlternatives = config.maxAlternatives ?? 1;
  recognition.lang = config.language ?? "en-US";

  return recognition;
}

/**
 * Transcribe audio from video element using Web Speech API
 * This is the main transcription function that processes video audio in real-time
 */
export async function transcribeVideoWithWebSpeech(
  videoElement: HTMLVideoElement,
  config: WebSpeechConfig = {},
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TranscriptSentence[]> {
  // Check browser support
  if (!isWebSpeechSupported()) {
    throw new WebSpeechError(
      "Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.",
      "NOT_SUPPORTED"
    );
  }

  console.log("[WebSpeech] Starting transcription with config:", config);

  // Validate language
  const language = config.language ?? "en-US";
  const supportedLanguages = getSupportedLanguages();
  if (!supportedLanguages.includes(language)) {
    console.warn(
      `[WebSpeech] Language ${language} may not be fully supported. Falling back to en-US`
    );
    config.language = "en-US";
  }

  onProgress?.({
    status: "extracting",
    message: "Preparing video audio for transcription...",
    percentage: 0,
  });

  // Get video duration
  const videoDuration = videoElement.duration;
  if (!videoDuration || videoDuration === 0) {
    throw new WebSpeechError(
      "Video duration is invalid. Please ensure video is loaded.",
      "AUDIO_FAILED"
    );
  }

  console.log(`[WebSpeech] Video duration: ${videoDuration} seconds`);

  // Create speech recognition instance
  const recognition = createSpeechRecognition(config);

  // Track transcript sentences
  const sentences: TranscriptSentence[] = [];
  let currentText = "";
  let sentenceStartTime = 0;
  let recognitionStartTime = 0;

  return new Promise((resolve, reject) => {
    let hasError = false;
    let noSpeechTimeout: NodeJS.Timeout;

    // Reset no-speech timeout
    const resetNoSpeechTimeout = () => {
      if (noSpeechTimeout) clearTimeout(noSpeechTimeout);
      noSpeechTimeout = setTimeout(() => {
        if (!hasError && sentences.length === 0) {
          console.warn("[WebSpeech] No speech detected after 10 seconds");
          recognition.stop();
          reject(
            new WebSpeechError(
              "No speech detected in the video. Please ensure the video has clear audio.",
              "NO_SPEECH"
            )
          );
          hasError = true;
        }
      }, 10000);
    };

    recognition.onstart = () => {
      console.log("[WebSpeech] Recognition started");
      recognitionStartTime = videoElement.currentTime;
      sentenceStartTime = recognitionStartTime;
      resetNoSpeechTimeout();

      onProgress?.({
        status: "transcribing",
        message: "Listening to video audio...",
        percentage: 10,
      });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (hasError) return;

      resetNoSpeechTimeout();

      // Get current time in video
      const currentVideoTime = videoElement.currentTime;

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        console.log(
          `[WebSpeech] Result ${i}: "${transcript}" (final: ${isFinal}, confidence: ${confidence.toFixed(2)})`
        );

        if (isFinal) {
          currentText += transcript + " ";

          // Parse into sentences
          const parsedSentences = parseSentences(currentText);

          // If we have complete sentences, add them
          if (parsedSentences.length > 0) {
            // Keep last incomplete sentence for next iteration
            const incompleteSentence =
              parsedSentences[parsedSentences.length - 1];
            const hasEndPunctuation = /[.!?]$/.test(incompleteSentence);

            const completeSentences = hasEndPunctuation
              ? parsedSentences
              : parsedSentences.slice(0, -1);

            completeSentences.forEach((sentenceText) => {
              const sentence: TranscriptSentence = {
                sentence_id: sentences.length,
                text: sentenceText.trim(),
                start_time: sentenceStartTime,
                end_time: currentVideoTime,
                confidence: Math.max(0.7, confidence), // Web Speech typically 0.7-0.8
              };

              sentences.push(sentence);
              sentenceStartTime = currentVideoTime;

              console.log(
                `[WebSpeech] Added sentence ${sentence.sentence_id}: "${sentence.text}"`
              );
            });

            // Update current text with incomplete sentence
            currentText = hasEndPunctuation ? "" : incompleteSentence + " ";

            // Update progress
            const progress = Math.min(
              90,
              10 + (currentVideoTime / videoDuration) * 80
            );
            onProgress?.({
              status: "transcribing",
              currentSentence: sentences.length,
              message: `Transcribing... (${sentences.length} sentences extracted)`,
              percentage: progress,
            });
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (hasError) return;

      console.error("[WebSpeech] Recognition error:", event.error);
      hasError = true;

      if (noSpeechTimeout) clearTimeout(noSpeechTimeout);

      let errorMessage = "Transcription failed. Please try again.";
      let errorCode: WebSpeechError["code"] = "TRANSCRIPTION_FAILED";

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          errorMessage =
            "Microphone permission denied. Please enable microphone access for transcription.";
          errorCode = "PERMISSION_DENIED";
          break;
        case "no-speech":
          errorMessage =
            "No speech detected. Please ensure the video has clear audio.";
          errorCode = "NO_SPEECH";
          break;
        case "network":
          errorMessage =
            "Network error during transcription. Please check your connection.";
          errorCode = "NETWORK_ERROR";
          break;
        case "aborted":
          // User cancelled, don't treat as error
          console.log("[WebSpeech] Transcription cancelled by user");
          return;
      }

      onProgress?.({
        status: "error",
        message: errorMessage,
      });

      reject(new WebSpeechError(errorMessage, errorCode));
    };

    recognition.onend = () => {
      if (noSpeechTimeout) clearTimeout(noSpeechTimeout);

      if (hasError) return;

      console.log(
        `[WebSpeech] Recognition ended. Total sentences: ${sentences.length}`
      );

      // Add any remaining text as final sentence
      if (currentText.trim()) {
        const sentence: TranscriptSentence = {
          sentence_id: sentences.length,
          text: currentText.trim(),
          start_time: sentenceStartTime,
          end_time: videoElement.currentTime,
          confidence: 0.75,
        };
        sentences.push(sentence);
        console.log(
          `[WebSpeech] Added final sentence ${sentence.sentence_id}: "${sentence.text}"`
        );
      }

      onProgress?.({
        status: "completed",
        currentSentence: sentences.length,
        totalSentences: sentences.length,
        message: `Transcription completed! ${sentences.length} sentences extracted.`,
        percentage: 100,
      });

      console.log(
        `[WebSpeech] Transcription complete. Extracted ${sentences.length} sentences`
      );
      resolve(sentences);
    };

    // Start recognition
    try {
      recognition.start();
    } catch (error) {
      console.error("[WebSpeech] Failed to start recognition:", error);
      reject(
        new WebSpeechError(
          "Failed to start speech recognition. Please try again.",
          "TRANSCRIPTION_FAILED"
        )
      );
    }
  });
}

/**
 * Transcribe audio blob using Web Speech API
 * Alternative method for pre-extracted audio
 */
export async function transcribeAudioWithWebSpeech(
  audioBlob: Blob,
  language: string = "en-US",
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TranscriptSentence[]> {
  if (!isWebSpeechSupported()) {
    throw new WebSpeechError(
      "Web Speech API is not supported in this browser.",
      "NOT_SUPPORTED"
    );
  }

  console.log(
    `[WebSpeech] Transcribing audio blob (size: ${audioBlob.size} bytes)`
  );

  onProgress?.({
    status: "processing",
    message: "Preparing audio for transcription...",
    percentage: 0,
  });

  // Create audio element from blob
  const audioUrl = URL.createObjectURL(audioBlob);
  const audioElement = new Audio(audioUrl);

  // Wait for audio to load
  await new Promise<void>((resolve, reject) => {
    audioElement.onloadedmetadata = () => resolve();
    audioElement.onerror = () =>
      reject(new WebSpeechError("Failed to load audio", "AUDIO_FAILED"));
  });

  // Play audio (required for recognition to work)
  audioElement.play();

  try {
    // Use video transcription method (works with audio too)
    const sentences = await transcribeVideoWithWebSpeech(
      audioElement as any,
      { language },
      onProgress
    );

    // Cleanup
    audioElement.pause();
    URL.revokeObjectURL(audioUrl);

    return sentences;
  } catch (error) {
    // Cleanup on error
    audioElement.pause();
    URL.revokeObjectURL(audioUrl);
    throw error;
  }
}

/**
 * Stop ongoing transcription
 * Useful for cancel functionality
 */
export function stopTranscription(recognition: SpeechRecognition): void {
  try {
    recognition.stop();
    console.log("[WebSpeech] Transcription stopped by user");
  } catch (error) {
    console.error("[WebSpeech] Error stopping transcription:", error);
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof WebSpeechError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred during transcription.";
}

/**
 * Format transcription time for logging
 */
export function formatTranscriptionTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}
