import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient.js';
import { useToast } from '../../../components/ui/Toast.js';
import { useApplyPoints } from '../../../hooks/useApplyPoints.js';
import { getErrorMessage } from '../../../lib/errors.js';
import type { ApiList, Product } from '../../../types/api.js';
import { addFavoriteApi, removeFavoriteApi } from '../api/favoritesApi.js';
import type { ToggleFavoriteVariables } from '../types/index.js';
import {
  withFavoriteAdded,
  withFavoriteFlag,
  withFavoriteRemoved,
} from '../utils/favoritesCache.js';

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const { applyPoints } = useApplyPoints();

  return useMutation({
    mutationKey: ['favorites', 'toggle'],
    mutationFn: ({ product, next }: ToggleFavoriteVariables) =>
      next ? addFavoriteApi(product.id) : removeFavoriteApi(product.id),
    onMutate: async ({ product, next }) => {
      // 1. Cancelar consultas en curso de products y favorites
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // 2. Guardar copias de seguridad
      const previousProductsQueries = queryClient.getQueriesData<ApiList<Product>>({
        queryKey: ['products'],
      });
      const previousFavorites = queryClient.getQueryData<Product[]>(['favorites']);

      // 3. Actualizar optimísticamente todas las páginas cacheadas de ['products']
      queryClient.setQueriesData<ApiList<Product>>(
        { queryKey: ['products'] },
        (oldData) => withFavoriteFlag(oldData, product.id, next),
      );

      // 4. Actualizar optimísticamente ['favorites'] si está en caché
      if (previousFavorites !== undefined) {
        const updatedFavorites = next
          ? withFavoriteAdded(previousFavorites, product)
          : withFavoriteRemoved(previousFavorites, product.id);
        queryClient.setQueryData(['favorites'], updatedFavorites);
      }

      return { previousProductsQueries, previousFavorites };
    },
    onError: (err, _variables, context) => {
      // Restaurar copias previas
      if (context?.previousProductsQueries) {
        for (const [key, data] of context.previousProductsQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFavorites !== undefined) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }

      toastError(getErrorMessage(err));

      if (err instanceof ApiError && err.code === 'PRODUCT_NOT_FOUND') {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      }
    },
    onSuccess: (result) => {
      // Sincronizar puntos con ['me'] (solo notifica si pointsAwarded > 0)
      applyPoints({
        pointsAwarded: result.pointsAwarded,
        pointsBalance: result.pointsBalance,
      });
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['favorites', 'toggle'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
  });
}
