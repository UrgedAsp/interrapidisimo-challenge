import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Favorite } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Favorite[] }>('/favorites');
      return data.data;
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { updatePoints } = useAuth();

  const addFav = useMutation({
    mutationFn: async (productId: number) => {
      const { data } = await apiClient.post<{ data: { productId: number; points: number } }>(
        `/favorites/${productId}`
      );
      return data.data;
    },
    onSuccess: (result) => {
      updatePoints(result.points);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const removeFav = useMutation({
    mutationFn: async (productId: number) => {
      await apiClient.delete(`/favorites/${productId}`);
      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return { addFav, removeFav };
}
