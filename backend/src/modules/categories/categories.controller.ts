import type { Request, Response } from 'express';
import { ok } from '../../shared/responses.js';
import type { CategoriesService } from './categories.service.js';

export function createCategoriesController(service: CategoriesService) {
  return {
    list(_req: Request, res: Response): void {
      ok(res, service.list());
    },
  };
}
