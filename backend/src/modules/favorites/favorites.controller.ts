import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { FavoritesService } from './favorites.service';

const service = new FavoritesService();

export function getFavorites(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const favorites = service.list(req.userId!);
    res.json({ data: favorites });
  } catch (err) {
    next(err);
  }
}

export function addFavorite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId);
    const result = service.add(req.userId!, productId);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export function removeFavorite(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId);
    service.remove(req.userId!, productId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
