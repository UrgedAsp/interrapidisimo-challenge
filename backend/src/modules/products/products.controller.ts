import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductsService } from './products.service';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().optional(),
  search: z.string().optional(),
});

const service = new ProductsService();

export function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = querySchema.parse(req.query);
    const result = service.list(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new Error('ID inválido');
    const product = service.findById(id);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}
