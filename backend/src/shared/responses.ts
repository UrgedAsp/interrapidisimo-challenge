import type { Response } from 'express';
import type { ApiList, ApiSuccess, PageMeta } from './types.js';

/**
 * Helpers de respuesta de éxito (§6). Todas las respuestas de éxito del API
 * pasan por aquí, así que la forma `{ data }` no depende de que cada controller
 * se acuerde.
 */

export function ok<T>(res: Response, data: T): void {
  res.json({ data } satisfies ApiSuccess<T>);
}

export function okList<T>(res: Response, data: T[], meta: PageMeta): void {
  res.json({ data, meta } satisfies ApiList<T>);
}

/** `meta` a partir del total real, con `totalPages` en 0 cuando no hay resultados. */
export function buildPageMeta(page: number, pageSize: number, total: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
