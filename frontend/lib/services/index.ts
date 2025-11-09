// YouTube service
export { extractYouTubeTranscript } from './youtubeTranscript';
export type { TranscriptResponse } from './youtubeTranscript';

// Web Speech service
export { transcribeAudioWithWebSpeech } from './webSpeechTranscript';

// Orchestrator (main entry point)
export { getTranscript } from './transcriptOrchestrator';

// Cache service
export {
  saveTranscriptToCache,
  getTranscriptFromCache,
  clearTranscriptCache,
  getCacheStats
} from './transcriptCache';
