import { PURCHASE_BLOCK_SIZE, PURCHASE_BONUS_PER_PRODUCT } from './rewards.config.js';

/**
 * Calcula los puntos otorgados por una compra (§2 de 03-rewards.md):
 * floor(total / 1000) + 5 * distinctProducts
 */
export function calculatePurchasePoints(total: number, distinctProducts: number): number {
  return Math.floor(total / PURCHASE_BLOCK_SIZE) + distinctProducts * PURCHASE_BONUS_PER_PRODUCT;
}
