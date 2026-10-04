import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ui/Toast.js';
import { useApplyPoints } from '../../../hooks/useApplyPoints.js';
import { getErrorMessage } from '../../../lib/errors.js';
import type { FavoriteResult, Product } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import {
  addFavoriteApi,
  getFavoritesApi,
  removeFavoriteApi,
} from '../api/favoritesApi.js';

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { applyPoints } = useApplyPoints();

  const favoritesQuery = useQuery<Product[]>({
    queryKey: ['favorites'],
    queryFn: getFavoritesApi,
    enabled: isAuthenticated,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (productId: number) => addFavoriteApi(productId),
    onSuccess: (result: FavoriteResult) => {
      applyPoints({
        pointsAwarded: result.pointsAwarded,
        pointsBalance: result.pointsBalance,
        message: '¡Agregado a favoritos!',
      });

      if (result.pointsAwarded === 0) {
        success('Producto agregado a favoritos');
      }

      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: number) => removeFavoriteApi(productId),
    onSuccess: (result: FavoriteResult) => {
      applyPoints({
        pointsAwarded: 0,
        pointsBalance: result.pointsBalance,
      });

      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      success('Producto quitado de favoritos');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  return {
    favorites: favoritesQuery.data ?? [],
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    refetch: favoritesQuery.refetch,
    addFavorite: addFavoriteMutation.mutate,
    isAdding: addFavoriteMutation.isPending,
    removeFavorite: removeFavoriteMutation.mutate,
    isRemoving: removeFavoriteMutation.isPending,
  };
}
