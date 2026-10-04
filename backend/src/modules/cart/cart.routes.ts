import { Router } from 'express';
import type { DatabaseConnection } from '../../db/connection.js';
import { createCartController } from './cart.controller.js';
import { createCartRepository } from './cart.repository.js';
import { createCartService } from './cart.service.js';

export function createCartRoutes(db: DatabaseConnection): Router {
  const repository = createCartRepository(db);
  const service = createCartService(repository);
  const controller = createCartController(service);

  const router = Router();

  router.get('/cart', controller.getCart);
  router.post('/cart/items', controller.addItem);
  router.patch('/cart/items/:productId', controller.updateItem);
  router.delete('/cart/items/:productId', controller.removeItem);

  return router;
}
