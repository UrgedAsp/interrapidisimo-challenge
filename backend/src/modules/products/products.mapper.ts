import type { Category, Product } from '../../shared/types.js';

/**
 * Forma de una fila de `products` con su categoría y su estado de favorito.
 *
 * La declara el repositorio y la consume el mapper. Vive aquí y no en el repositorio
 * porque el mismo `SELECT` lo necesita también `GET /api/favorites`, que no va a
 * pasar por products.
 */
export type ProductRow = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  stock: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  /** Sale de `EXISTS`, así que SQLite lo entrega como 0 o 1, no como booleano. */
  is_favorite: number;
};

/**
 * Fila -> `Product` del contrato (02-api-contract.md §3).
 *
 * Exportado fuera del módulo de products a propósito: `GET /api/favorites` tiene que
 * devolver exactamente la misma forma de `Product`, y duplicar el mapeo haría que
 * ambos endpoints se separen en cuanto uno cambie. Lo reutiliza `modules/favorites`.
 */
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    imageUrl: row.image_url,
    stock: row.stock,
    category: toCategory(row),
    // Sin esta conversión el JSON llevaría `isFavorite: 1`, y el `=== true` del
    // cliente fallaría sin avisar.
    isFavorite: row.is_favorite === 1,
  };
}

function toCategory(row: ProductRow): Category {
  return {
    id: row.category_id,
    name: row.category_name,
    slug: row.category_slug,
  };
}
