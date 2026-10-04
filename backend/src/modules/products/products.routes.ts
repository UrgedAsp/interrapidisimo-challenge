import { Router } from 'express';
import type { DatabaseConnection } from '../../db/connection.js';
import { createProductsController } from './products.controller.js';
import { createProductsRepository } from './products.repository.js';
import { createProductsService } from './products.service.js';

/**
 * Rutas del catálogo (10-backend-products.md §3).
 *
 * No se vuelven a montar sobre `/api` desde app.ts: se registra bajo el router
 * protegido, así que el guard de `authenticate` ya corre antes. `isFavorite`
 * depende del usuario, así que el catálogo no puede ser público.
 */
export function createProductsRoutes(db: DatabaseConnection): Router {
  const repository = createProductsRepository(db);
  const service = createProductsService(repository);
  const controller = createProductsController(service);

  const router = Router();

  router.get('/products', controller.list);

  return router;
}
