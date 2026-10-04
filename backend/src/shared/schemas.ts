import { z } from 'zod';

/**
 * Esquemas de entrada que el contrato define a nivel de API (sección 4) y que usan más de
 * un módulo. Los esquemas propios de un endpoint viven junto a él
 * (`modules/<módulo>/<módulo>.schema.ts`).
 *
 * Los mensajes van explícitos en los parámetros de paginación: son los que ve
 * el usuario final en la UI y los automáticos ("Demasiado grande: se esperaba
 * que número fuera <=50") no se leen bien en un formulario.
 */

export const paginationQuery = z.object({
  page: z.coerce
    .number({ error: 'Debe ser un número' })
    .int('Debe ser un entero')
    .min(1, 'Debe ser 1 o más')
    .default(1),
  pageSize: z.coerce
    .number({ error: 'Debe ser un número' })
    .int('Debe ser un entero')
    .min(1, 'Debe ser 1 o más')
    .max(50, 'Debe ser 50 o menos')
    .default(12),
});

export const productIdParam = z.strictObject({
  productId: z.coerce.number({ error: 'Debe ser un número' }).int('Debe ser un entero').positive(),
});

/** Cantidad de un ítem de carrito: 1 a 99 (sección 4.3). */
export const quantity = z.coerce
  .number({ error: 'Debe ser un número' })
  .int('Debe ser un entero')
  .min(1, 'Debe ser entre 1 y 99')
  .max(99, 'Debe ser entre 1 y 99');

/**
 * `POST /api/cart/items`: la cantidad es opcional y por defecto 1. Se usa
 * `strictObject` para que mandar `points` u otro campo desconocido sea un 422
 * explícito en vez de ignorarse en silencio.
 */
export const addCartItemBody = z.strictObject({
  productId: z.coerce.number({ error: 'Debe ser un número' }).int('Debe ser un entero').positive(),
  quantity: quantity.default(1),
});

/** `PATCH /api/cart/items/:productId`: la cantidad es obligatoria y fija la total. */
export const updateCartItemBody = z.strictObject({
  quantity,
});
