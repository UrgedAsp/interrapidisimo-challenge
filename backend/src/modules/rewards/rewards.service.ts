import { calculatePurchasePoints } from './rewards.calculator.js';
import { FAVORITE_POINTS } from './rewards.config.js';
import type { RewardsRepository } from './rewards.repository.js';

export function createRewardsService(repository: RewardsRepository) {
  return {
    awardFavorite(userId: number, productId: number): { pointsAwarded: number; pointsBalance: number } {
      return repository.awardPoints(userId, 'FAVORITE', String(productId), FAVORITE_POINTS);
    },

    awardPurchase(
      userId: number,
      order: { id: number; total: number; distinctProducts: number },
    ): { pointsAwarded: number; pointsBalance: number } {
      const points = calculatePurchasePoints(order.total, order.distinctProducts);
      return repository.awardPoints(userId, 'PURCHASE', String(order.id), points);
    },

    getBalance(userId: number): number {
      return repository.getBalance(userId);
    },

    getLedgerSum(userId: number): number {
      return repository.getSumFromLedger(userId);
    },
  };
}

export type RewardsService = ReturnType<typeof createRewardsService>;
