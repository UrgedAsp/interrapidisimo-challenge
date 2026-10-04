import type { DatabaseConnection } from '../../db/connection.js';
import { normalizeText } from '../../shared/text.js';
import type { ProductRow } from './products.mapper.js';

/** Filtros ya validados y derivados, tal como los necesita el SQL. */
export type ProductFilters = {
  userId: number;
  pageSize: number;
  offset: number;
  category: string | null;
  /** `%texto%` ya escapado, o `null` si no hay búsqueda. */
  pattern: string | null;
};

const FROM_JOINED = 'FROM products p JOIN categories c ON c.id = p.category_id';

/**
 * `is_favorite` va dentro del SELECT y no en una consulta aparte: pedir los favoritos
 * primero y cruzarlos en memoria es un N+1 sobre el tamaño de la página.
 */
const SELECT_COLUMNS = `
  SELECT p.id, p.name, p.price, p.image_url, p.stock,
         c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
         EXISTS (SELECT 1 FROM favorites f
                 WHERE f.user_id = :userId AND f.product_id = p.id) AS is_favorite
  ${FROM_JOINED}
`;

/**
 * Búsqueda: `normalize_text(p.name)` para que "camara" encuentre "Cámara" (sección 4).
 * El `ESCAPE` es lo que permite que el patrón traiga las barras invertidas que
 * escapan los comodines.
 */
const SEARCH = "(:pattern IS NULL OR normalize_text(p.name) LIKE :pattern ESCAPE '\\')";

const CATEGORY = 'c.slug = :category';

/**
 * `name` primero y `id` de segundo.
 *
 * El `id` no es redundante: dos productos pueden llamarse igual, y sin él SQLite
 * puede devolverlos en cualquier orden entre dos peticiones. Eso hace que la
 * paginación repita un producto en una página y lo omita en la siguiente.
 */
const ORDER = 'ORDER BY p.name COLLATE NOCASE ASC, p.id ASC';

/**
 * Los comodines de `LIKE` van escapados para que el usuario escriba lo que quiere
 * buscar. Sin esto, buscar `%` devolvería el catálogo entero y buscar `_` cualquier
 * producto de un solo caracter.
 *
 * El orden importa: primero se normaliza y después se escapa, porque escapar antes
 * convertiría la barra invertida en `\\` y la normalización la dejaría intacta.
 */
export function toLikePattern(query: string): string {
  const escaped = normalizeText(query).replace(/[%_\\]/g, (match) => `\\${match}`);

  return `%${escaped}%`;
}

export function createProductsRepository(db: DatabaseConnection) {
  const listByCategory = db.prepare(
    `${SELECT_COLUMNS} WHERE ${CATEGORY} AND ${SEARCH} ${ORDER} LIMIT :pageSize OFFSET :offset`,
  );
  const listAll = db.prepare(
    `${SELECT_COLUMNS} WHERE ${SEARCH} ${ORDER} LIMIT :pageSize OFFSET :offset`,
  );

  // El total va en su propia consulta: con `LIMIT 12`, contar las filas devueltas no
  // distingue entre 12 productos y 400.
  const countByCategory = db.prepare(
    `SELECT COUNT(*) AS total ${FROM_JOINED} WHERE ${CATEGORY} AND ${SEARCH}`,
  );
  const countAll = db.prepare(`SELECT COUNT(*) AS total ${FROM_JOINED} WHERE ${SEARCH}`);

  return {
    /** Una página de productos con su categoría y su estado de favorito. */
    list(filters: ProductFilters): ProductRow[] {
      return (filters.category === null ? listAll : listByCategory).all(filters) as ProductRow[];
    },

    /** Cuántos productos cumplen los filtros, para el `meta`. */
    count(filters: Pick<ProductFilters, 'category' | 'pattern'>): number {
      const row = (filters.category === null ? countAll : countByCategory).get(filters) as
        | { total: number }
        | undefined;

      return row?.total ?? 0;
    },
  };
}

export type ProductsRepository = ReturnType<typeof createProductsRepository>;
