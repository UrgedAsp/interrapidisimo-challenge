import { useQuery } from '@tanstack/react-query';
import type { Product } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { getFavoritesApi } from '../api/favoritesApi.js';

export function useFavorites() {
  const { isAuthenticated } = useAuth();

  return useQuery<Product[]>({
    queryKey: ['favorites'],
    queryFn: getFavoritesApi,
    enabled: isAuthenticated,
  });
}
