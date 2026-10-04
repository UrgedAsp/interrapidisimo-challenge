import { apiGet, apiSend } from '../../../api/apiClient.js';
import type { FavoriteResult, Product } from '../../../types/api.js';

export async function getFavoritesApi(): Promise<Product[]> {
  return apiGet<Product[]>('/favorites');
}

export async function addFavoriteApi(productId: number): Promise<FavoriteResult> {
  return apiSend<FavoriteResult>('PUT', `/favorites/${productId}`);
}

export async function removeFavoriteApi(productId: number): Promise<FavoriteResult> {
  return apiSend<FavoriteResult>('DELETE', `/favorites/${productId}`);
}
