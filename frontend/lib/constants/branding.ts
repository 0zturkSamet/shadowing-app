/**
 * ShadowTube Branding Constants
 *
 * Central location for all branding-related constants
 * including colors, typography, and brand identity.
 */

export const BRAND = {
  name: 'ShadowTube',
  tagline: 'Practice Shadowing. Improve Speaking. Master Any Video.',
  description: 'Paste any YouTube link and shadow effortlessly with auto-scroll transcripts.',
} as const;

export const COLORS = {
  youtubeRed: '#FF0000',
  black: '#000000',
  white: '#FFFFFF',
  secondary: '#1A1A1A',
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    primary: 'Inter, Roboto, system-ui, sans-serif',
    headings: 'Inter, system-ui, sans-serif',
  },
} as const;

export const SOCIAL_LINKS = {
  github: 'https://github.com/0zturkSamet',
  linkedin: 'https://linkedin.com',
  email: 'mailto:contact@shadowtube.com',
} as const;

export const MOTIVATIONAL_QUOTES = [
  'Start your journey',
  'Consistency creates fluency',
  'Shadow daily, improve instantly',
  'Master languages through practice',
  'Your voice, perfected',
  'Practice makes progress',
] as const;

export const NAVIGATION = {
  main: [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
  ],
  auth: {
    signIn: { name: 'Sign In', href: '/auth/login' },
    signUp: { name: 'Sign Up', href: '/auth/register' },
  },
} as const;
