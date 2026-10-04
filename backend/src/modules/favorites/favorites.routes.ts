import { Router } from 'express';
import type { DatabaseConnection } from '../../db/connection.js';
import type { RewardsService } from '../rewards/rewards.service.js';
import { createFavoritesController } from './favorites.controller.js';
import { createFavoritesRepository } from './favorites.repository.js';
import { createFavoritesService } from './favorites.service.js';

export function createFavoritesRoutes(db: DatabaseConnection, rewardsService: RewardsService): Router {
  const repository = createFavoritesRepository(db);
  const service = createFavoritesService(db, repository, rewardsService);
  const controller = createFavoritesController(service);

  const router = Router();

  router.get('/favorites', controller.list);
  router.put('/favorites/:productId', controller.add);
  router.delete('/favorites/:productId', controller.remove);

  return router;
}
