import { Router } from 'express';
import type { DatabaseConnection } from '../../db/connection.js';
import { createOrdersRepository } from '../orders/orders.repository.js';
import type { RewardsService } from '../rewards/rewards.service.js';
import { createCartController } from './cart.controller.js';
import { createCartRepository } from './cart.repository.js';
import { createCartService } from './cart.service.js';
import { createCheckoutService } from './checkout.service.js';

export function createCartRoutes(db: DatabaseConnection, rewardsService: RewardsService): Router {
  const repository = createCartRepository(db);
  const service = createCartService(repository);
  const ordersRepository = createOrdersRepository(db);
  const checkoutService = createCheckoutService(db, repository, ordersRepository, rewardsService);
  const controller = createCartController(service, checkoutService);

  const router = Router();

  router.get('/cart', controller.getCart);
  router.post('/cart/items', controller.addItem);
  router.patch('/cart/items/:productId', controller.updateItem);
  router.delete('/cart/items/:productId', controller.removeItem);
  router.post('/cart/checkout', controller.checkout);

  return router;
}

