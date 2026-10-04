import { useQuery } from '@tanstack/react-query';
import type { User } from '../../../types/api.js';
import { getMeApi } from '../api/authApi.js';
import { useAuth } from './useAuth.js';

export function useMe() {
  const { isAuthenticated } = useAuth();

  return useQuery<User>({
    queryKey: ['me'],
    queryFn: getMeApi,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}
