# ShadowSpeak Frontend

A modern Next.js 14 frontend for ShadowSpeak - a language learning web application that helps users improve their pronunciation through shadowing techniques.

## Features

- 🎯 **Video Search**: Find language learning videos by keyword and language
- 📊 **Progress Tracking**: Monitor your learning progress with detailed statistics
- 🎤 **Practice Sessions**: Shadow native speakers with interactive practice sessions
- 🏆 **Achievements**: Earn badges and track your streaks
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── providers.tsx      # React Query provider
│   ├── practice/          # Practice pages
│   │   └── [id]/
│   │       └── page.tsx
│   └── dashboard/         # Dashboard page
│       └── page.tsx
├── components/            # Reusable components
│   ├── Header.tsx
│   ├── VideoSearch.tsx
│   ├── VideoCard.tsx
│   ├── StatCard.tsx
│   └── PhraseSelector.tsx
├── hooks/                 # Custom React hooks
│   ├── useVideoSearch.ts
│   └── useUserStats.ts
├── services/             # API services
│   └── api.ts
├── types/                # TypeScript type definitions
│   └── index.ts
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Components

### Home Page
- Displays trending videos
- Search functionality with language filtering
- User statistics overview

### Practice Page
- Video player for shadowing exercises
- Phrase selector for targeted practice
- Recording functionality (to be implemented)
- Real-time scoring (to be implemented)

### Dashboard Page
- Comprehensive statistics
- Progress tracking over time
- Recent practice history
- Achievement badges

## API Integration

The frontend connects to the FastAPI backend through the `/api` endpoint. Configure the base URL in your environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note**: Do not include `/api` in the base URL - the frontend code automatically appends the correct API paths.

## Styling

The project uses Tailwind CSS with a custom color scheme:

- **Primary**: Indigo/Purple gradients
- **Success**: Emerald tones
- **Warning**: Yellow/Orange tones
- **Neutral**: Gray scale

## Development Notes

- Currently uses mock data for demonstration
- API integration is set up but not fully connected
- Recording and scoring features are placeholder implementations
- Progress charts are placeholder implementations

## Future Enhancements

- [ ] Complete API integration with backend
- [ ] Implement audio recording functionality
- [ ] Add real-time pronunciation scoring
- [ ] Create progress visualization charts
- [ ] Add user authentication
- [ ] Implement dark mode
- [ ] Add multi-language support for UI
- [ ] Create offline mode support

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is part of the ShadowSpeak language learning platform.
