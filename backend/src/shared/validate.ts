import type { Request } from 'express';
import { z, ZodError, type ZodType } from 'zod';
import type { ErrorDetail } from './types.js';

/**
 * Los mensajes de Zod salen en inglés por defecto y sección 2 exige español.
 * `z.locales.es()` los traduce en un solo punto de la app en lugar de repetir
 * un mensaje por cada regla de cada esquema.
 */
z.config(z.locales.es());

/**
 * Validación de entrada (sección 1). Los esquemas se declaran junto a cada endpoint y
 * se parsean aquí; un `ZodError` que escapa de un service lo traduce el
 * middleware de errores a 422 VALIDATION_ERROR.
 *
 * Los esquemas de cuerpo usan `z.strictObject`: un campo no reconocido se
 * rechaza con 422 en lugar de ignorarse en silencio. Así `points` en el cuerpo
 * es un error explícito y no un campo que el cliente cree estar enviando.
 */
export function parseBody<S extends ZodType>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.body ?? {});
}

export function parseQuery<S extends ZodType>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.query);
}

export function parseParams<S extends ZodType>(schema: S, req: Request): z.infer<S> {
  return schema.parse(req.params);
}

/**
 * Convierte los issues de Zod en `details` de sección 2, uno por campo. Un issue en la
 * raíz (por ejemplo un cuerpo que no es un objeto) no lleva `field`, porque
 * `field` es opcional en el contrato.
 */
export function validationDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => {
    const field = issue.path.map(String).join('.');
    return { ...(field ? { field } : {}), message: issue.message };
  });
}
