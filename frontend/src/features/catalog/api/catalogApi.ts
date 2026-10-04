import { apiGet, apiGetList } from '../../../api/apiClient.js';
import type { ApiList, Category, Product } from '../../../types/api.js';

export type ProductQueryParams = {
  page?: number;
  pageSize?: number;
  category?: string;
  q?: string;
};

export async function getCategoriesApi(): Promise<Category[]> {
  return apiGet<Category[]>('/categories');
}

export async function getProductsApi(params: ProductQueryParams = {}): Promise<ApiList<Product>> {
  return apiGetList<Product>('/products', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      category: params.category,
      q: params.q,
    },
  });
}
