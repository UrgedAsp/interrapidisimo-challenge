import type { DatabaseConnection } from './database.js';
import { applySchema, openDatabase } from './database.js';
import { seed, seedSummary } from './seed.js';

export const IN_MEMORY = ':memory:';

/** Base en memoria con el esquema aplicado. Es lo que usan las pruebas (§7). */
export function createTestDatabase(): DatabaseConnection {
  const db = openDatabase(IN_MEMORY);
  applySchema(db);
  return db;
}

export function createSeededDatabase(): DatabaseConnection {
  const db = createTestDatabase();
  seed(db);
  return db;
}

export function countRows(db: DatabaseConnection, table: string): number {
  const row = db
    .prepare<[], { total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)
    .get();

  return row?.total ?? 0;
}

export { seed, seedSummary };