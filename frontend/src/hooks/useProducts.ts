import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Product, PaginationMeta } from '@/types';

interface UseProductsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

export function useProducts(params: UseProductsParams = {}) {
  const { page = 1, pageSize = 12, category, search } = params;

  return useQuery({
    queryKey: ['products', { page, pageSize, category, search }],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        data: Product[];
        meta: PaginationMeta;
      }>('/products', {
        params: {
          page,
          pageSize,
          ...(category && { category }),
          ...(search && { search }),
        },
      });
      return data;
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Product }>(`/products/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}
