import type { DatabaseConnection } from '../../db/connection.js';
import type { Category } from '../../shared/types.js';

type CategoryRow = { id: number; name: string; slug: string };

/**
 * `categories` es una tabla de cinco filas que cambia con el seed, así que no tiene
 * paginación ni filtros: una consulta y ya.
 */
export function createCategoriesRepository(db: DatabaseConnection) {
  const listAll = db.prepare('SELECT id, name, slug FROM categories ORDER BY name ASC');

  return {
    list(): Category[] {
      const rows = listAll.all() as CategoryRow[];

      return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
    },
  };
}

export type CategoriesRepository = ReturnType<typeof createCategoriesRepository>;
