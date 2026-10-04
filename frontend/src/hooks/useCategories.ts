import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Category } from '@/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Category[] }>('/categories');
      return data.data;
    },
    staleTime: Infinity, // Las categorías no cambian en esta app
  });
}
