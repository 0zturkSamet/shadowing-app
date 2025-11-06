'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';

interface VideoSearchBarProps {
  onSearch: (query: string, language: string) => void;
  isLoading: boolean;
  resultCount?: number;
  error?: string | null;
}

export default function VideoSearchBar({
  onSearch,
  isLoading,
  resultCount = 0,
  error = null,
}: VideoSearchBarProps) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('en');

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'it', label: 'Italian' },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), language);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim(), language);
    }
  };

  return (
    <div className="w-full">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for videos (e.g., 'cooking', 'travel', 'technology')..."
            disabled={isLoading}
            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        {/* Language Dropdown */}
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLoading}
            className="w-full sm:w-48 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none cursor-pointer transition-all"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Search
            </>
          )}
        </button>
      </form>

      {/* Results Info */}
      {!error && resultCount > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm font-medium">
            Found {resultCount} video{resultCount !== 1 ? 's' : ''} matching your search
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Search Failed</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="ml-3 text-gray-600">Searching for videos...</p>
        </div>
      )}
    </div>
  );
}
