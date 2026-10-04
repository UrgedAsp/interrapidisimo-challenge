import type { Request, Response } from 'express';
import { requireUser } from '../../middlewares/auth.js';
import { parseQuery } from '../../shared/validate.js';
import { okList } from '../../shared/responses.js';
import type { ProductsService } from './products.service.js';
import { productsQuery } from './products.schema.js';

/**
 * Un ZodError lanzado aquí lo traduce el middleware de errores a
 * 422 VALIDATION_ERROR con un `detail` por campo (sección 4). Por eso no hay try/catch.
 */
export function createProductsController(service: ProductsService) {
  return {
    list(req: Request, res: Response): void {
      const query = parseQuery(productsQuery, req);
      // `req.user` es opcional en el tipo porque `authenticate` no siempre corre
      // antes. Aquí siempre corre: la ruta se registra bajo el router protegido.
      // `requireUser` convierte esa garantía en algo que el compilador chequea, en
      // vez de un `req.user!.id` que solo funciona si nadie mueve la ruta de sitio.
      const { id: userId } = requireUser(req);
      const { data, meta } = service.list(query, userId);

      okList(res, data, meta);
    },
  };
}
