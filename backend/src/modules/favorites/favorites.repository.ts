import db from '../../db/database';

interface FavoriteRow {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  rating: number;
  category_name: string;
  created_at: string;
}

export class FavoritesRepository {
  findByUser(userId: number): FavoriteRow[] {
    return db
      .prepare(
        `SELECT f.id, f.product_id, p.name, p.price, p.image_url, p.rating,
                c.name as category_name, f.created_at
         FROM favorites f
         JOIN products p ON f.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`
      )
      .all(userId) as FavoriteRow[];
  }

  exists(userId: number, productId: number): boolean {
    const row = db
      .prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userId, productId);
    return !!row;
  }

  add(userId: number, productId: number) {
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(userId, productId);
  }

  remove(userId: number, productId: number) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(userId, productId);
  }

  findProductIds(userId: number): number[] {
    const rows = db
      .prepare('SELECT product_id FROM favorites WHERE user_id = ?')
      .all(userId) as { product_id: number }[];
    return rows.map((r) => r.product_id);
  }
}
