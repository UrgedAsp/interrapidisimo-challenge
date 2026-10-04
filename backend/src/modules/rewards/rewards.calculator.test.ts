import { describe, expect, it } from 'vitest';
import { calculatePurchasePoints } from './rewards.calculator.js';

describe('calculatePurchasePoints (sección 2 de 03-rewards.md)', () => {
  it('1 producto de $89.900 (x1) otorga 94 puntos', () => {
    // floor(89900/1000) = 89 + 5 = 94
    expect(calculatePurchasePoints(89900, 1)).toBe(94);
  });

  it('2 unidades de $45.000 y 1 de $120.000 (total $210.000, 2 productos) otorga 220 puntos', () => {
    // floor(210000/1000) = 210 + (2 * 5) = 220
    expect(calculatePurchasePoints(210000, 2)).toBe(220);
  });

  it('1 producto de $15.500 otorga 20 puntos', () => {
    // floor(15500/1000) = 15 + 5 = 20
    expect(calculatePurchasePoints(15500, 1)).toBe(20);
  });

  it('un total menor a $1.000 con un producto produce 5 puntos', () => {
    // floor(800/1000) = 0 + 5 = 5
    expect(calculatePurchasePoints(800, 1)).toBe(5);
  });
});
