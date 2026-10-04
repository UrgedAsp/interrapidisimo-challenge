import type { DatabaseConnection } from '../../db/connection.js';
import { cartEmpty, outOfStock, outOfStockMultiple } from '../../shared/errors.js';
import type { CheckoutResult, ErrorDetail } from '../../shared/types.js';
import type { OrdersRepository } from '../orders/orders.repository.js';
import type { RewardsService } from '../rewards/rewards.service.js';
import type { CartRepository } from './cart.repository.js';

export type CheckoutItemRow = {
  productId: number;
  name: string;
  price: number;
  stock: number;
  quantity: number;
};

export function createCheckoutService(
  db: DatabaseConnection,
  cartRepository: CartRepository,
  ordersRepository: OrdersRepository,
  rewardsService: RewardsService,
) {
  const selectCheckoutItems = db.prepare(
    `SELECT ci.product_id AS productId, p.name, p.price, p.stock, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.id ASC`,
  );

  const deductStock = db.prepare(
    'UPDATE products SET stock = stock - :quantity WHERE id = :productId AND stock >= :quantity',
  );

  const closeCart = db.prepare(
    "UPDATE carts SET status = 'checked_out' WHERE id = ? AND status = 'open'",
  );

  const checkoutTx = db.transaction((userId: number): CheckoutResult => {
    // 1. Obtener carrito abierto
    const cartRow = cartRepository.getOrCreateOpenCart(userId);

    // 2. Obtener items con stock y precio vigente
    const items = selectCheckoutItems.all(cartRow.id) as CheckoutItemRow[];
    if (items.length === 0) {
      throw cartEmpty();
    }

    // 3. Verificar stock de todos los items
    const stockErrors: ErrorDetail[] = [];
    for (const item of items) {
      if (item.quantity > item.stock) {
        stockErrors.push({
          productId: item.productId,
          message: `Stock insuficiente: solicitadas ${item.quantity}, disponibles ${item.stock}`,
        });
      }
    }

    if (stockErrors.length > 0) {
      throw outOfStockMultiple(stockErrors);
    }

    // 4. Calcular total con precios vigentes
    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }

    // 5. Descontar stock producto por producto
    for (const item of items) {
      const result = deductStock.run({
        productId: item.productId,
        quantity: item.quantity,
      });

      if (result.changes !== 1) {
        throw outOfStock(item.productId, 'Sin stock suficiente');
      }
    }

    // 6. Insertar orden
    const orderRow = ordersRepository.createOrder(userId, cartRow.id, total);

    // 7. Insertar items de orden
    for (const item of items) {
      ordersRepository.createOrderItem(orderRow.id, item.productId, item.quantity, item.price);
    }

    // 8. Cerrar el carrito
    const closeResult = closeCart.run(cartRow.id);
    if (closeResult.changes !== 1) {
      throw cartEmpty();
    }

    // 9. Otorgar puntos
    const { pointsAwarded, pointsBalance } = rewardsService.awardPurchase(userId, {
      id: orderRow.id,
      total,
      distinctProducts: items.length,
    });

    const orderItems = ordersRepository.getOrderItems(orderRow.id);

    return {
      order: {
        id: orderRow.id,
        total: orderRow.total,
        createdAt: orderRow.created_at,
        items: orderItems,
      },
      pointsAwarded,
      pointsBalance,
    };
  });

  return {
    checkout(userId: number): CheckoutResult {
      return checkoutTx(userId);
    },
  };
}

export type CheckoutService = ReturnType<typeof createCheckoutService>;
