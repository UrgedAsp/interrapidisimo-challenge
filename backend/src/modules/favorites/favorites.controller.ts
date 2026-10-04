import type { Request, Response } from 'express';
import { requireUser } from '../../middlewares/auth.js';
import { ok } from '../../shared/responses.js';
import { parseParams } from '../../shared/validate.js';
import { productIdParam } from './favorites.schema.js';
import type { FavoritesService } from './favorites.service.js';

export function createFavoritesController(service: FavoritesService) {
  return {
    list(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const favorites = service.list(userId);
      ok(res, favorites);
    },

    add(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const { productId } = parseParams(productIdParam, req);
      const result = service.add(userId, productId);
      ok(res, result);
    },

    remove(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const { productId } = parseParams(productIdParam, req);
      const result = service.remove(userId, productId);
      ok(res, result);
    },
  };
}
