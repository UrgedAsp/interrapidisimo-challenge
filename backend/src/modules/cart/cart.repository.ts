import db from '../../db/database';

interface CartItemRow {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  stock: number;
  subtotal: number;
}

interface CartRow {
  id: number;
  user_id: number;
  items: CartItemRow[];
  total: number;
  itemCount: number;
}

export class CartRepository {
  getOrCreateCart(userId: number): CartRow {
    let cart = db
      .prepare('SELECT * FROM carts WHERE user_id = ?')
      .get(userId) as { id: number; user_id: number } | undefined;

    if (!cart) {
      const result = db
        .prepare('INSERT INTO carts (user_id) VALUES (?)')
        .run(userId);
      cart = { id: Number(result.lastInsertRowid), user_id: userId };
    }

    const items = db
      .prepare(
        `SELECT ci.id, ci.product_id, p.name, p.price, p.image_url, p.stock,
                ci.quantity, (p.price * ci.quantity) as subtotal
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?
         ORDER BY ci.id`
      )
      .all(cart.id) as CartItemRow[];

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { id: cart.id, user_id: userId, items, total, itemCount };
  }

  upsertItem(cartId: number, productId: number, quantity: number) {
    db.prepare(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(cart_id, product_id)
       DO UPDATE SET quantity = quantity + excluded.quantity`
    ).run(cartId, productId, quantity);
  }

  setItemQuantity(cartId: number, productId: number, quantity: number) {
    db.prepare(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(cart_id, product_id)
       DO UPDATE SET quantity = excluded.quantity`
    ).run(cartId, productId, quantity);
  }

  removeItem(cartId: number, productId: number) {
    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(
      cartId,
      productId
    );
  }

  clearCart(cartId: number) {
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
  }
}
