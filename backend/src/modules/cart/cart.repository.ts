import type { DatabaseConnection } from '../../db/connection.js';
import { toCart, type CartItemRow } from './cart.mapper.js';
import type { Cart } from '../../shared/types.js';

export type CartRow = {
  id: number;
  user_id: number;
  status: 'open' | 'checked_out';
  created_at: string;
};

export type ProductStockRow = {
  id: number;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
};

export type CartItemEntity = {
  id: number;
  cart_id: number;
  product_id: number;
  quantity: number;
};

export function createCartRepository(db: DatabaseConnection) {
  const findOpenCart = db.prepare(
    "SELECT id, user_id, status, created_at FROM carts WHERE user_id = ? AND status = 'open'",
  );

  const insertOpenCart = db.prepare(
    "INSERT INTO carts (user_id, status) VALUES (?, 'open') RETURNING id, user_id, status, created_at",
  );

  const selectCartItems = db.prepare(
    `SELECT ci.id, ci.product_id, p.name, p.price, p.image_url, ci.quantity, p.stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.id ASC`,
  );

  const selectProduct = db.prepare(
    'SELECT id, name, price, stock, image_url AS imageUrl FROM products WHERE id = ?',
  );

  const selectCartItem = db.prepare(
    'SELECT id, cart_id, product_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
  );

  const upsertItemStmt = db.prepare(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES (:cartId, :productId, :quantity)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = excluded.quantity`,
  );

  const updateItemQtyStmt = db.prepare(
    'UPDATE cart_items SET quantity = :quantity WHERE cart_id = :cartId AND product_id = :productId',
  );

  const deleteItemStmt = db.prepare(
    'DELETE FROM cart_items WHERE cart_id = :cartId AND product_id = :productId',
  );

  return {
    getOrCreateOpenCart(userId: number): CartRow {
      const existing = findOpenCart.get(userId) as CartRow | undefined;
      if (existing) {
        return existing;
      }
      try {
        return insertOpenCart.get(userId) as CartRow;
      } catch {
        // En caso de inserción simultánea que choque con el índice único
        return findOpenCart.get(userId) as CartRow;
      }
    },

    getCartWithItems(userId: number): Cart {
      const cartRow = this.getOrCreateOpenCart(userId);
      const items = selectCartItems.all(cartRow.id) as CartItemRow[];
      return toCart(cartRow.id, items);
    },

    findProduct(productId: number): ProductStockRow | null {
      const row = selectProduct.get(productId) as ProductStockRow | undefined;
      return row ?? null;
    },

    findCartItem(cartId: number, productId: number): CartItemEntity | null {
      const row = selectCartItem.get(cartId, productId) as CartItemEntity | undefined;
      return row ?? null;
    },

    upsertItem(cartId: number, productId: number, quantity: number): void {
      upsertItemStmt.run({ cartId, productId, quantity });
    },

    updateItemQuantity(cartId: number, productId: number, quantity: number): boolean {
      const result = updateItemQtyStmt.run({ cartId, productId, quantity });
      return result.changes > 0;
    },

    removeItem(cartId: number, productId: number): void {
      deleteItemStmt.run({ cartId, productId });
    },
  };
}

export type CartRepository = ReturnType<typeof createCartRepository>;
