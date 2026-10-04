import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, countRows } from './testing.js';
import type { DatabaseConnection } from './database.js';

let db: DatabaseConnection;

function insertUser(email = 'ana@tienda.co'): number {
  const result = db
    .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email, 'hash', 'Ana Restrepo');

  return Number(result.lastInsertRowid);
}

function insertCategory(name = 'Hogar', slug = 'hogar'): number {
  const result = db
    .prepare('INSERT INTO categories (name, slug) VALUES (?, ?)')
    .run(name, slug);

  return Number(result.lastInsertRowid);
}

function insertProduct(categoryId: number, overrides: Partial<{ price: number; stock: number }> = {}) {
  const { price = 32000, stock = 10 } = overrides;

  return db
    .prepare(
      'INSERT INTO products (name, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?)',
    )
    .run('Espátula de bambú', price, categoryId, 'https://example.test/p.webp', stock);
}

beforeEach(() => {
  db = createTestDatabase();
});

afterEach(() => {
  db.close();
});

describe('esquema', () => {
  it('crea todas las tablas de §4', () => {
    const rows = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all();
    const tables = rows.map((row) => row.name);

    for (const table of [
      'users',
      'categories',
      'products',
      'carts',
      'cart_items',
      'favorites',
      'orders',
      'order_items',
      'points_ledger',
    ]) {
      expect(tables).toContain(table);
    }
  });

  it('crea los índices descritos en §4', () => {
    const rows = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all();
    const indexes = rows.map((row) => row.name);

    expect(indexes).toEqual(
      expect.arrayContaining([
        'idx_products_category',
        'idx_products_name',
        'one_open_cart_per_user',
        'sqlite_autoindex_favorites_1',
        'sqlite_autoindex_order_items_1',
        'sqlite_autoindex_points_ledger_1',
      ]),
    );
  });

  it('abre cada conexión con foreign_keys activo', () => {
    const pragma = db.pragma('foreign_keys', { simple: true });

    expect(pragma).toBe(1);
  });
});

describe('invariante 2: un solo carrito abierto por usuario', () => {
  it('rechaza el segundo carrito open del mismo usuario', () => {
    const userId = insertUser();
    db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId);

    expect(() =>
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId),
    ).toThrow(/UNIQUE/);
  });

  it('permite un carrito nuevo cuando el anterior ya está cobrado', () => {
    const userId = insertUser();
    const first = db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId);
    db.prepare("UPDATE carts SET status = 'checked_out' WHERE id = ?").run(first.lastInsertRowid);

    expect(() =>
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId),
    ).not.toThrow();
  });

  it('permite varios carritos cobrados para el mismo usuario', () => {
    const userId = insertUser();
    const insert = "INSERT INTO carts (user_id, status) VALUES (?, 'checked_out')";
    db.prepare(insert).run(userId);
    db.prepare(insert).run(userId);

    expect(() => db.prepare(insert).run(userId)).not.toThrow();
  });

  it('rechaza estados de carrito distintos de open y checked_out', () => {
    const userId = insertUser();

    expect(() =>
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'abandoned')").run(userId),
    ).toThrow(/CHECK/);
  });
});

describe('anti-abuso: points_ledger', () => {
  it('rechaza dos premios con el mismo (user, action, reference)', () => {
    const userId = insertUser();
    db.prepare(
      "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'FAVORITE', '7', 5)",
    ).run(userId);

    expect(() =>
      db
        .prepare(
          "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'FAVORITE', '7', 5)",
        )
        .run(userId),
    ).toThrow(/UNIQUE/);
  });

  it('permite premios distintos para el mismo usuario', () => {
    const userId = insertUser();
    db.prepare(
      "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'FAVORITE', '7', 5)",
    ).run(userId);

    expect(() =>
      db
        .prepare(
          "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'FAVORITE', '8', 5)",
        )
        .run(userId),
    ).not.toThrow();
  });

  it('rechaza acciones fuera de FAVORITE y PURCHASE', () => {
    const userId = insertUser();

    expect(() =>
      db
        .prepare(
          "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'REVIEW', '1', 5)",
        )
        .run(userId),
    ).toThrow(/CHECK/);
  });

  it('rechaza puntos no positivos', () => {
    const userId = insertUser();

    expect(() =>
      db
        .prepare(
          "INSERT INTO points_ledger (user_id, action, reference, points) VALUES (?, 'PURCHASE', '1', 0)",
        )
        .run(userId),
    ).toThrow(/CHECK/);
  });
});

describe('invariante 1: el saldo nunca es negativo', () => {
  it('rechaza un points_balance negativo', () => {
    expect(() =>
      db
        .prepare('INSERT INTO users (email, password_hash, name, points_balance) VALUES (?, ?, ?, ?)')
        .run('negativo@tienda.co', 'hash', 'Negativo', -1),
    ).toThrow(/CHECK/);
  });
});

describe('invariante 3: stock no negativo y precios positivos', () => {
  it('rechaza stock negativo', () => {
    const categoryId = insertCategory();

    expect(() => insertProduct(categoryId, { stock: -1 })).toThrow(/CHECK/);
  });

  it('acepta stock cero', () => {
    const categoryId = insertCategory();

    expect(() => insertProduct(categoryId, { stock: 0 })).not.toThrow();
  });

  it('rechaza precio cero y precio negativo', () => {
    const categoryId = insertCategory();

    expect(() => insertProduct(categoryId, { price: 0 })).toThrow(/CHECK/);
    expect(() => insertProduct(categoryId, { price: -1000 })).toThrow(/CHECK/);
  });

  it('rechaza cantidad cero en cart_items y order_items', () => {
    const userId = insertUser();
    const categoryId = insertCategory();
    const productId = Number(insertProduct(categoryId).lastInsertRowid);
    const cartId = Number(
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId)
        .lastInsertRowid,
    );

    expect(() =>
      db
        .prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)')
        .run(cartId, productId, 0),
    ).toThrow(/CHECK/);
  });
});

describe('claves foráneas', () => {
  it('rechaza un producto con categoría inexistente', () => {
    expect(() => insertProduct(9999)).toThrow(/FOREIGN KEY/);
  });

  it('rechaza un carrito de usuario inexistente', () => {
    expect(() =>
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(9999),
    ).toThrow(/FOREIGN KEY/);
  });

  it('rechaza un favorito de producto inexistente', () => {
    const userId = insertUser();

    expect(() =>
      db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(userId, 9999),
    ).toThrow(/FOREIGN KEY/);
  });

  it('borra los cart_items al eliminar el carrito (ON DELETE CASCADE)', () => {
    const userId = insertUser();
    const categoryId = insertCategory();
    const productId = Number(insertProduct(categoryId).lastInsertRowid);
    const cartId = Number(
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId)
        .lastInsertRowid,
    );
    db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(
      cartId,
      productId,
      2,
    );

    db.prepare('DELETE FROM carts WHERE id = ?').run(cartId);

    expect(countRows(db, 'cart_items')).toBe(0);
  });
});

describe('unicidad de carts y favoritos', () => {
  it('no permite el mismo producto dos veces en un carrito', () => {
    const userId = insertUser();
    const categoryId = insertCategory();
    const productId = Number(insertProduct(categoryId).lastInsertRowid);
    const cartId = Number(
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'open')").run(userId)
        .lastInsertRowid,
    );
    const insert = 'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)';
    db.prepare(insert).run(cartId, productId, 1);

    expect(() => db.prepare(insert).run(cartId, productId, 3)).toThrow(/UNIQUE/);
  });

  it('no permite favoritar el mismo producto dos veces', () => {
    const userId = insertUser();
    const categoryId = insertCategory();
    const productId = Number(insertProduct(categoryId).lastInsertRowid);
    const insert = 'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)';
    db.prepare(insert).run(userId, productId);

    expect(() => db.prepare(insert).run(userId, productId)).toThrow(/UNIQUE/);
  });

  it('no permite dos órdenes para el mismo carrito', () => {
    const userId = insertUser();
    const cartId = Number(
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'checked_out')").run(userId)
        .lastInsertRowid,
    );
    const insert = 'INSERT INTO orders (user_id, cart_id, total) VALUES (?, ?, ?)';
    db.prepare(insert).run(userId, cartId, 64000);

    expect(() => db.prepare(insert).run(userId, cartId, 64000)).toThrow(/UNIQUE/);
  });

  it('rechaza una orden con total no positivo', () => {
    const userId = insertUser();
    const cartId = Number(
      db.prepare("INSERT INTO carts (user_id, status) VALUES (?, 'checked_out')").run(userId)
        .lastInsertRowid,
    );
    const insert = 'INSERT INTO orders (user_id, cart_id, total) VALUES (?, ?, ?)';

    expect(() => db.prepare(insert).run(userId, cartId, 0)).toThrow(/CHECK/);
  });

  it('trata el email como único sin distinguir mayúsculas', () => {
    insertUser('ana@tienda.co');

    expect(() => insertUser('ANA@TIENDA.CO')).toThrow(/UNIQUE/);
  });
});