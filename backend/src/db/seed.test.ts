import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import type { DatabaseConnection } from './database.js';
import { createTestDatabase, countRows, seed, seedSummary } from './testing.js';

let db: DatabaseConnection;

beforeEach(() => {
  db = createTestDatabase();
});

afterEach(() => {
  db.close();
});

describe('contenido del seed (§6)', () => {
  it('crea 4 a 5 categorías y unos 40 productos', () => {
    seed(db);
    const summary = seedSummary(db);

    expect(summary.categories).toBeGreaterThanOrEqual(4);
    expect(summary.categories).toBeLessThanOrEqual(5);
    expect(summary.products).toBeGreaterThanOrEqual(35);
    expect(summary.products).toBeLessThanOrEqual(45);
  });

  it('crea 2 usuarios con contraseña hasheada con bcrypt', () => {
    seed(db);
    const users = db
      .prepare<[], { email: string; password_hash: string; name: string }>(
        'SELECT email, password_hash, name FROM users ORDER BY id',
      )
      .all();

    expect(users).toHaveLength(2);
    for (const user of users) {
      expect(user.password_hash).toMatch(/^\$2[aby]\$/);
      expect(user.password_hash).not.toBe('ClaveDemo123');
      expect(bcrypt.compareSync('ClaveDemo123', user.password_hash)).toBe(true);
    }
  });

  it('deja el saldo de puntos en cero', () => {
    seed(db);
    const row = db
      .prepare<[], { total: number }>('SELECT SUM(points_balance) AS total FROM users')
      .get();

    expect(row?.total).toBe(0);
  });

  it('asigna todos los productos a una categoría existente', () => {
    seed(db);
    const orphans = db
      .prepare<[], { total: number }>(
        'SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE c.id IS NULL',
      )
      .get();

    expect(orphans?.total).toBe(0);
  });

  it('guarda los precios como enteros en miles de pesos', () => {
    seed(db);
    const notRounded = db
      .prepare<[], { total: number }>('SELECT COUNT(*) AS total FROM products WHERE price % 1000 != 0')
      .get();

    expect(notRounded?.total).toBe(0);
  });

  it('incluye al menos un producto sin stock para poder probar OUT_OF_STOCK', () => {
    seed(db);
    const row = db
      .prepare<[], { total: number }>('SELECT COUNT(*) AS total FROM products WHERE stock = 0')
      .get();

    expect(row?.total).toBeGreaterThan(0);
  });

  it('no deja productos ni categorías duplicados', () => {
    seed(db);
    const duplicateProducts = db
      .prepare<[], { total: number }>(
        'SELECT COUNT(*) AS total FROM (SELECT name FROM products GROUP BY name HAVING COUNT(*) > 1)',
      )
      .get();
    const duplicateCategories = db
      .prepare<[], { total: number }>(
        'SELECT COUNT(*) AS total FROM (SELECT slug FROM categories GROUP BY slug HAVING COUNT(*) > 1)',
      )
      .get();

    expect(duplicateProducts?.total).toBe(0);
    expect(duplicateCategories?.total).toBe(0);
  });
});

describe('idempotencia (§6)', () => {
  it('puede ejecutarse dos veces sin duplicar datos', () => {
    seed(db);
    const first = seedSummary(db);

    expect(() => seed(db)).not.toThrow();
    const second = seedSummary(db);

    expect(second).toEqual(first);
  });

  it('puede ejecutarse tres veces sin duplicar datos', () => {
    seed(db);
    seed(db);
    const before = seedSummary(db);

    seed(db);

    expect(seedSummary(db)).toEqual(before);
  });

  it('conserva el hash original para no invalidar las contraseñas', () => {
    seed(db);
    const before = db.prepare<[], { password_hash: string }>('SELECT password_hash FROM users').all();

    seed(db);
    const after = db.prepare<[], { password_hash: string }>('SELECT password_hash FROM users').all();

    expect(after).toEqual(before);
  });

  it('no crea carritos ni órdenes', () => {
    seed(db);

    expect(countRows(db, 'carts')).toBe(0);
    expect(countRows(db, 'cart_items')).toBe(0);
    expect(countRows(db, 'orders')).toBe(0);
    expect(countRows(db, 'order_items')).toBe(0);
    expect(countRows(db, 'favorites')).toBe(0);
    expect(countRows(db, 'points_ledger')).toBe(0);
  });
});