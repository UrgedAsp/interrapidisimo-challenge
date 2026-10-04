import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';

const service = new CategoriesService();

export function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = service.list();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
}
