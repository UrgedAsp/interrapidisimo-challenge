import type { ApiList, Product } from '../../../types/api.js';

export function withFavoriteFlag(
  list: ApiList<Product> | undefined,
  productId: number,
  isFavorite: boolean,
): ApiList<Product> | undefined {
  if (!list) return undefined;

  const updatedProducts = list.data.map((product) => {
    if (product.id === productId) {
      return {
        ...product,
        isFavorite,
      };
    }
    return product;
  });

  return {
    ...list,
    data: updatedProducts,
  };
}

export function withFavoriteAdded(
  favorites: Product[] | undefined,
  product: Product,
): Product[] {
  const current = favorites ? [...favorites] : [];
  const exists = current.some((p) => p.id === product.id);

  if (exists) {
    return current.map((p) => (p.id === product.id ? { ...p, isFavorite: true } : p));
  }

  return [{ ...product, isFavorite: true }, ...current];
}

export function withFavoriteRemoved(
  favorites: Product[] | undefined,
  productId: number,
): Product[] {
  if (!favorites) return [];
  return favorites.filter((p) => p.id !== productId);
}
