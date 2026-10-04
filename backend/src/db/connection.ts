import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeText } from '../shared/text.js';

const DB_DIR = dirname(fileURLToPath(import.meta.url));

const IN_MEMORY = ':memory:';

export type DatabaseConnection = Database.Database;

/**
 * Registra las funciones que SQL usa y SQLite no trae.
 *
 * Van en la conexión y no en el `WHERE` de cada consulta porque el orden de
 * evaluación de SQLite no está garantizado: `normalize_text(name) LIKE ?` puede
 * ejecutarse en cualquier orden. Dentro de una función registrada, el motor
 * resuelve el índice antes de invocar, así que el orden de los predicados deja
 * de importar.
 *
 * `deterministic` le dice a SQLite que el resultado depende solo del argumento, y con
 * eso la función vale en índices y en planes con `LIKE`/`GLOB`. La lógica es la de
 * `shared/text.ts`, no una copia: si las dos versiones difieren, la búsqueda falla en
 * silencio.
 */
function registerFunctions(db: Database.Database): void {
  db.function('normalize_text', { deterministic: true }, normalizeText);
}

/**
 * Abre una conexión y garantiza que el esquema de §4 exista.
 *
 * `foreign_keys` viene apagado por defecto en SQLite y es por conexión, así que
 * se activa en cada apertura: sin esto las claves foráneas no se validan.
 * Se usa `db.pragma()` y no `exec()` porque devuelve el valor resultante y
 * falla si SQLite no lo acepta.
 */
export function openDatabase(databasePath: string): Database.Database {
  if (databasePath !== IN_MEMORY) {
    const dir = dirname(databasePath);
    if (dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  registerFunctions(db);

  return db;
}

/**
 * Aplica `schema.sql`. Todas las sentencias son `IF NOT EXISTS`, así que correr
 * el seed dos veces sobre la misma base no duplica nada.
 */
export function applySchema(db: Database.Database): void {
  db.exec(readFileSync(join(DB_DIR, 'schema.sql'), 'utf8'));
}

export function openDatabaseWithSchema(databasePath: string): Database.Database {
  const db = openDatabase(databasePath);
  applySchema(db);
  return db;
}