/**
 * Example usage of YouTube Transcript Service
 *
 * This file demonstrates how to use the extractYouTubeTranscript function
 */

import { extractYouTubeTranscript, extractVideoId } from './youtubeTranscript';

// Example 1: Extract transcript from a video ID
async function example1() {
  const videoId = 'dQw4w9WgXcQ'; // Example video ID
  const result = await extractYouTubeTranscript(videoId, 'en');

  if (result.status === 'success') {
    console.log(`✓ Successfully extracted ${result.totalSentences} sentences`);
    console.log(`✓ Language: ${result.language}`);
    console.log(`✓ First sentence: ${result.transcript[0].text}`);
  } else {
    console.error(`✗ Error: ${'message' in result ? result.message : 'Unknown error'}`);
  }
}

// Example 2: Extract video ID from URL
async function example2() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const videoId = extractVideoId(url);

  if (videoId) {
    console.log(`✓ Extracted video ID: ${videoId}`);
    const result = await extractYouTubeTranscript(videoId);
    console.log(`✓ Status: ${result.status}`);
  }
}

// Example 3: Handle errors gracefully
async function example3() {
  const result = await extractYouTubeTranscript('invalid_id', 'en');

  if (result.status === 'error') {
    console.log(`✗ Error code: ${'code' in result ? result.code : 'UNKNOWN'}`);
    console.log(`✗ Error message: ${'message' in result ? result.message : 'Unknown error'}`);
  }
}

// Example 4: Language fallback
async function example4() {
  const videoId = 'dQw4w9WgXcQ';
  // Request Spanish, will fallback to English or any available
  const result = await extractYouTubeTranscript(videoId, 'es');

  if (result.status === 'success') {
    console.log(`✓ Requested: es, Got: ${result.language}`);
  }
}

// Uncomment to run examples:
// example1();
// example2();
// example3();
// example4();
