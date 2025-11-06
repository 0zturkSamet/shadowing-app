import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { searchVideos } from '@/services/api';
import { Video, SearchParams } from '@/types';

/**
 * Custom hook for video search with debouncing
 */
export const useVideoSearch = (initialQuery: string = '', initialLanguage: string = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [language, setLanguage] = useState(initialLanguage);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Search params
  const searchParams: SearchParams = {
    query: debouncedQuery,
    language: language || undefined,
  };

  // Use React Query for data fetching
  const { data, isLoading, error, refetch } = useQuery<Video[], Error>({
    queryKey: ['videos', debouncedQuery, language],
    queryFn: () => searchVideos(searchParams),
    enabled: debouncedQuery.length > 0 || language.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    videos: data || [],
    isLoading,
    error,
    query,
    setQuery,
    language,
    setLanguage,
    refetch,
  };
};

export default useVideoSearch;
