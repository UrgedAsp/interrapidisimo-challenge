import { Router } from 'express';
import type { DatabaseConnection } from '../../db/connection.js';
import { createCategoriesController } from './categories.controller.js';
import { createCategoriesRepository } from './categories.repository.js';
import { createCategoriesService } from './categories.service.js';

/**
 * Rutas de categorías (10-backend-products.md sección 5).
 *
 * Se registra bajo el router protegido por el mismo motivo que products:
 * `GET /api/products` devuelve `isFavorite` del usuario y ambos leen de las mismas
 * tablas, así que el catálogo es una superficie autenticada.
 */
export function createCategoriesRoutes(db: DatabaseConnection): Router {
  const repository = createCategoriesRepository(db);
  const service = createCategoriesService(repository);
  const controller = createCategoriesController(service);

  const router = Router();

  router.get('/categories', controller.list);

  return router;
}
