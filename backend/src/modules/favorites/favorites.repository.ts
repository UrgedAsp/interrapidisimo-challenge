import type { DatabaseConnection } from '../../db/connection.js';
import type { ProductRow } from '../products/products.mapper.js';

export function createFavoritesRepository(db: DatabaseConnection) {
  const selectFavorites = db.prepare(
    `SELECT p.id, p.name, p.price, p.image_url, p.stock,
            c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
            1 AS is_favorite
     FROM favorites f
     JOIN products p ON p.id = f.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC, p.id ASC`,
  );

  const insertFavorite = db.prepare(
    `INSERT INTO favorites (user_id, product_id)
     VALUES (?, ?)
     ON CONFLICT DO NOTHING`,
  );

  const deleteFavorite = db.prepare(
    'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
  );

  const checkProduct = db.prepare(
    'SELECT 1 FROM products WHERE id = ?',
  );

  return {
    list(userId: number): ProductRow[] {
      return selectFavorites.all(userId) as ProductRow[];
    },

    add(userId: number, productId: number): void {
      insertFavorite.run(userId, productId);
    },

    remove(userId: number, productId: number): void {
      deleteFavorite.run(userId, productId);
    },

    existsProduct(productId: number): boolean {
      return Boolean(checkProduct.get(productId));
    },
  };
}

export type FavoritesRepository = ReturnType<typeof createFavoritesRepository>;
