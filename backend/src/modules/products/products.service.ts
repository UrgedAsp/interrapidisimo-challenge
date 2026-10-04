import type { ApiList, PageMeta, Product } from '../../shared/types.js';
import { toProduct } from './products.mapper.js';
import { toLikePattern, type ProductsRepository } from './products.repository.js';
import type { ProductsQuery } from './products.schema.js';

/**
 * Reglas del listado de catálogo (10-backend-products.md §4).
 *
 * No calcula nada que no venga de la base: la paginación, el orden y el total se
 * resuelven en SQL y aquí solo se arma el `meta`. El service no elige qué productos
 * son favoritos: eso lo trae cada fila ya resuelto con `EXISTS`.
 */
export function createProductsService(repository: ProductsRepository) {
  return {
    list(query: ProductsQuery, userId: number): ApiList<Product> {
      const filters = {
        userId,
        pageSize: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
        category: query.category ?? null,
        pattern: query.q === undefined ? null : toLikePattern(query.q),
      };

      const rows = repository.list(filters);
      const total = repository.count(filters);

      return { data: rows.map(toProduct), meta: buildMeta(query, total) };
    },
  };
}

/**
 * `totalPages` en 0 cuando no hay resultados: `ceil(0 / 12)` ya da 0, pero dejar el
 * caso explícito evita depender de esa aritmética si algún día cambia la fórmula.
 *
 * Una página fuera de rango no es un error: `data` va vacío y el `meta` sigue
 * diciendo la verdad, que es lo que necesita el cliente para pintar "página 5 de 3".
 */
function buildMeta(query: ProductsQuery, total: number): PageMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  };
}

export type ProductsService = ReturnType<typeof createProductsService>;
