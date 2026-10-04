import type { DatabaseConnection } from '../../db/connection.js';
import { productNotFound } from '../../shared/errors.js';
import type { FavoriteResult, Product } from '../../shared/types.js';
import { toProduct } from '../products/products.mapper.js';
import type { RewardsService } from '../rewards/rewards.service.js';
import type { FavoritesRepository } from './favorites.repository.js';

export function createFavoritesService(
  db: DatabaseConnection,
  repository: FavoritesRepository,
  rewardsService: RewardsService,
) {
  const addTransaction = db.transaction((userId: number, productId: number): FavoriteResult => {
    if (!repository.existsProduct(productId)) {
      throw productNotFound(productId);
    }

    repository.add(userId, productId);
    const { pointsAwarded, pointsBalance } = rewardsService.awardFavorite(userId, productId);

    return {
      productId,
      isFavorite: true,
      pointsAwarded,
      pointsBalance,
    };
  });

  return {
    list(userId: number): Product[] {
      const rows = repository.list(userId);
      return rows.map(toProduct);
    },

    add(userId: number, productId: number): FavoriteResult {
      return addTransaction(userId, productId);
    },

    remove(userId: number, productId: number): FavoriteResult {
      repository.remove(userId, productId);
      const pointsBalance = rewardsService.getBalance(userId);

      return {
        productId,
        isFavorite: false,
        pointsAwarded: 0,
        pointsBalance,
      };
    },
  };
}

export type FavoritesService = ReturnType<typeof createFavoritesService>;
