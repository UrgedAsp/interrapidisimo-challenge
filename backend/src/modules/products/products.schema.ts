import { z } from 'zod';
import { paginationQuery } from '../../shared/schemas.js';

/**
 * Query de `GET /api/products` (10-backend-products.md sección 4).
 *
 * Se extiende de la paginación compartida porque `page` y `pageSize` tienen el
 * mismo contrato en todos los listados paginados.
 *
 * No es `strictObject`: los parámetros desconocidos se ignoran (sección 4), así que
 * `?utm_source=noticias` no puede romper la petición del catálogo. Los repetidos, en
 * cambio, llegan a Zod como array y sí caen en el 422, porque un `?page=1&page=2`
 * no tiene una lectura razonable.
 */

/** Slug de categoría: minúsculas, números y guiones, como `hogar` o `accesorios`. */
const categorySlug = z
  .string()
  .trim()
  .max(50, 'Máximo 50 caracteres')
  .regex(/^[a-z0-9-]*$/, 'Categoría inválida');

/**
 * Texto que no aporta filtro.
 *
 * La spec solo dice esto para `q`, pero un `category=` vacío se trata igual. Sin
 * esto, limpiar el filtro del cliente dejaría el catálogo entero con
 * `c.slug = ''`, que no casa con ninguna categoría y devolvería una lista vacía sin
 * explicación. Vacío se interpreta como "sin filtro".
 */
const emptyToUndefined = (value: string) => (value.length === 0 ? undefined : value);

export const productsQuery = paginationQuery.extend({
  category: categorySlug.transform(emptyToUndefined).optional(),
  q: z.string().trim().max(100, 'Máximo 100 caracteres').transform(emptyToUndefined).optional(),
});

export type ProductsQuery = z.infer<typeof productsQuery>;
