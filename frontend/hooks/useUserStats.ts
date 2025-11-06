import { useQuery } from '@tanstack/react-query';
import { getUserStats } from '@/services/api';
import { UserProgress } from '@/types';

/**
 * Custom hook for fetching user statistics
 */
export const useUserStats = () => {
  const { data, isLoading, error, refetch } = useQuery<UserProgress, Error>({
    queryKey: ['userStats'],
    queryFn: getUserStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    retry: 2,
  });

  return {
    stats: data,
    isLoading,
    error,
    refetch,
  };
};

export default useUserStats;
