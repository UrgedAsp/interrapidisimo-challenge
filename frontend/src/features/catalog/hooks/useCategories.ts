import { useQuery } from '@tanstack/react-query';
import type { Category } from '../../../types/api.js';
import { getCategoriesApi } from '../api/catalogApi.js';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategoriesApi(signal),
    staleTime: 10 * 60 * 1000,
  });
}
