import { AppError } from '../../shared/errors/AppError';
import { CartRepository } from '../cart/cart.repository';
import { ProductsRepository } from '../products/products.repository';
import { RewardsRepository } from '../rewards/rewards.repository';
import db from '../../db/database';

const cartRepo = new CartRepository();
const productsRepo = new ProductsRepository();
const rewardsRepo = new RewardsRepository();

// Regla de puntos: 1 punto por cada $1,000 COP gastados
const POINTS_PER_THOUSAND = 1;

export class OrdersService {
  checkout(userId: number) {
    const cart = cartRepo.getOrCreateCart(userId);
    if (cart.items.length === 0) {
      throw AppError.badRequest('EMPTY_CART', 'El carrito está vacío');
    }

    // Verificar stock de todos los ítems antes de crear la orden
    for (const item of cart.items) {
      const product = productsRepo.findById(item.product_id);
      if (!product || product.stock < item.quantity) {
        throw AppError.unprocessable(
          'OUT_OF_STOCK',
          `Sin stock suficiente para "${item.name}"`
        );
      }
    }

    // Ejecutar todo en una transacción
    const createOrder = db.transaction(() => {
      // Crear orden
      const orderResult = db
        .prepare(
          'INSERT INTO orders (user_id, total, points_earned) VALUES (?, ?, ?)'
        )
        .run(userId, cart.total, 0);
      const orderId = Number(orderResult.lastInsertRowid);

      // Insertar ítems y decrementar stock
      for (const item of cart.items) {
        db.prepare(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`
        ).run(orderId, item.product_id, item.quantity, item.price);

        productsRepo.decrementStock(item.product_id, item.quantity);
      }

      // Calcular y otorgar puntos (1 punto por cada $1,000 COP)
      const pointsEarned = Math.floor(cart.total / 1000) * POINTS_PER_THOUSAND;
      db.prepare('UPDATE orders SET points_earned = ? WHERE id = ?').run(pointsEarned, orderId);
      rewardsRepo.addPoints(userId, pointsEarned, 'CHECKOUT', orderId);

      // Limpiar carrito
      cartRepo.clearCart(cart.id);

      return { orderId, total: cart.total, pointsEarned };
    });

    const result = createOrder();
    const newPoints = rewardsRepo.getPoints(userId);

    return {
      ...result,
      totalPoints: newPoints,
    };
  }

  listByUser(userId: number) {
    const orders = db
      .prepare(
        `SELECT o.id, o.total, o.points_earned, o.created_at
         FROM orders o
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`
      )
      .all(userId);
    return orders;
  }
}
