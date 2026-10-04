import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { getFavorites, addFavorite, removeFavorite } from './favorites.controller';

export const favoritesRouter = Router();

favoritesRouter.use(authenticate);
favoritesRouter.get('/', getFavorites);
favoritesRouter.post('/:productId', addFavorite);
favoritesRouter.delete('/:productId', removeFavorite);
