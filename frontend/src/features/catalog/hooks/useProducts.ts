import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiList, Product } from '../../../types/api.js';
import { getProductsApi } from '../api/catalogApi.js';
import type { CatalogFilters } from '../types/index.js';

export const CATALOG_PAGE_SIZE = 12;

export interface UseProductsOptions {
  onPageOutOfRange?: (validPage: number) => void;
}

export function useProducts(filters: CatalogFilters, options?: UseProductsOptions) {
  const { category, q, page } = filters;

  const query = useQuery<ApiList<Product>>({
    queryKey: ['products', { category, q, page }],
    queryFn: ({ signal }) =>
      getProductsApi(
        {
          category: category || undefined,
          q: q || undefined,
          page,
          pageSize: CATALOG_PAGE_SIZE,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const totalPages = query.data?.meta?.totalPages;
  const total = query.data?.meta?.total;

  // Si page > meta.totalPages y hay resultados, corregir a la última página válida
  useEffect(() => {
    if (totalPages !== undefined && total !== undefined && total > 0 && page > totalPages) {
      options?.onPageOutOfRange?.(totalPages);
    }
  }, [totalPages, total, page, options]);

  return query;
}
