import type { DatabaseConnection } from '../../db/connection.js';

export type OrderRow = {
  id: number;
  user_id: number;
  cart_id: number;
  total: number;
  created_at: string;
};

export type OrderItemRow = {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

export function createOrdersRepository(db: DatabaseConnection) {
  const insertOrderStmt = db.prepare(
    `INSERT INTO orders (user_id, cart_id, total)
     VALUES (:userId, :cartId, :total)
     RETURNING id, user_id, cart_id, total, created_at`,
  );

  const insertOrderItemStmt = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
     VALUES (:orderId, :productId, :quantity, :unitPrice)`,
  );

  const selectOrderItemsStmt = db.prepare(
    `SELECT oi.product_id AS productId, p.name, oi.quantity, oi.unit_price AS unitPrice
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.product_id ASC`,
  );

  return {
    createOrder(userId: number, cartId: number, total: number): OrderRow {
      return insertOrderStmt.get({ userId, cartId, total }) as OrderRow;
    },

    createOrderItem(orderId: number, productId: number, quantity: number, unitPrice: number): void {
      insertOrderItemStmt.run({ orderId, productId, quantity, unitPrice });
    },

    getOrderItems(orderId: number): OrderItemRow[] {
      return selectOrderItemsStmt.all(orderId) as OrderItemRow[];
    },
  };
}

export type OrdersRepository = ReturnType<typeof createOrdersRepository>;
