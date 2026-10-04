import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ui/Toast.js';
import { getErrorMessage } from '../../../lib/errors.js';
import { formatPoints } from '../../../lib/format.js';
import type { FavoriteResult, Product, User } from '../../../types/api.js';
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

  const favoritesQuery = useQuery<Product[]>({
    queryKey: ['favorites'],
    queryFn: getFavoritesApi,
    enabled: isAuthenticated,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (productId: number) => addFavoriteApi(productId),
    onSuccess: (result: FavoriteResult) => {
      // 1. Actualizar puntos de usuario en caché si hubo premio
      queryClient.setQueryData<User>(['me'], (old) => {
        if (!old) return old;
        return { ...old, pointsBalance: result.pointsBalance };
      });

      // 2. Invalidar favoritos y productos para sincronizar isFavorite
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      if (result.pointsAwarded > 0) {
        success(`¡Has ganado +${formatPoints(result.pointsAwarded)} puntos por agregar a favoritos!`);
      } else {
        success('Producto agregado a favoritos');
      }
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: number) => removeFavoriteApi(productId),
    onSuccess: (result: FavoriteResult) => {
      queryClient.setQueryData<User>(['me'], (old) => {
        if (!old) return old;
        return { ...old, pointsBalance: result.pointsBalance };
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
