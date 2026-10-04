import bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { env } from '../config/env.js';
import { openDatabase, applySchema, type DatabaseConnection } from './database.js';

const SEED_DIR = join(dirname(fileURLToPath(import.meta.url)), 'seed-data');

const SEED_USERS = [
  { email: 'ana@tienda.co', name: 'Ana Restrepo', password: 'ClaveDemo123' },
  { email: 'carlos@tienda.co', name: 'Carlos Múnera', password: 'ClaveDemo123' },
] as const;

const BCRYPT_ROUNDS = 10;

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().positive(),
  category: z.string().min(1),
  imageUrl: z.url(),
  stock: z.number().int().nonnegative(),
});

const seedDataSchema = z.object({
  _meta: z.object({
    source: z.string(),
    fetchedAt: z.string(),
    usdToCopRate: z.number().positive(),
    note: z.string(),
  }),
  categories: z.array(categorySchema).min(1),
  products: z.array(productSchema).min(1),
});

export type SeedData = z.infer<typeof seedDataSchema>;

export function readSeedData(): SeedData {
  const raw = readFileSync(join(SEED_DIR, 'products.json'), 'utf8');

  return seedDataSchema.parse(JSON.parse(raw));
}

/**
 * Carga el seed. Es idempotente por construcción: cada INSERT lleva un
 * `WHERE NOT EXISTS` en vez de un UPSERT, para no depender de una clave natural
 * que el esquema de §4 no declara (`products.name` no es UNIQUE).
 */
export function seed(db: DatabaseConnection): void {
  const data = readSeedData();

  const insertCategory = db.prepare(
    `INSERT INTO categories (name, slug)
     SELECT @name, @slug
     WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = @slug)`,
  );

  const insertProduct = db.prepare(
    `INSERT INTO products (name, price, category_id, image_url, stock)
     SELECT @name, @price, @categoryId, @imageUrl, @stock
     WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = @name)`,
  );

  const insertUser = db.prepare(
    `INSERT INTO users (email, password_hash, name)
     SELECT @email, @passwordHash, @name
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = @email)`,
  );

  const runSeed = db.transaction(() => {
    for (const category of data.categories) {
      insertCategory.run(category);
    }

    const slugToId = new Map<string, number>();
    for (const row of db
      .prepare<[], { id: number; slug: string }>('SELECT id, slug FROM categories')
      .all()) {
      slugToId.set(row.slug, row.id);
    }

    for (const product of data.products) {
      const categoryId = slugToId.get(product.category);
      if (categoryId === undefined) {
        throw new Error(`Categoría desconocida en el seed: "${product.category}"`);
      }
      insertProduct.run({ ...product, categoryId });
    }

    for (const user of SEED_USERS) {
      insertUser.run({
        email: user.email,
        name: user.name,
        passwordHash: bcrypt.hashSync(user.password, BCRYPT_ROUNDS),
      });
    }
  });

  runSeed();
}

const TABLES = ['categories', 'products', 'users'] as const;

export function seedSummary(db: DatabaseConnection): Record<(typeof TABLES)[number], number> {
  const summary = {} as Record<(typeof TABLES)[number], number>;

  for (const table of TABLES) {
    // La tabla viene de la unión TABLES, no de entrada del usuario.
    const row = db
      .prepare<[], { total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)
      .get();
    summary[table] = row?.total ?? 0;
  }

  return summary;
}

function isMainModule(): boolean {
  return process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;
}

if (isMainModule()) {
  const db = openDatabase(env.DATABASE_PATH);
  applySchema(db);

  try {
    seed(db);

    const { categories, products, users } = seedSummary(db);
    console.log(`Seed aplicado en ${env.DATABASE_PATH}`);
    console.log(`  ${categories} categorías, ${products} productos, ${users} usuarios`);
  } finally {
    db.close();
  }
}