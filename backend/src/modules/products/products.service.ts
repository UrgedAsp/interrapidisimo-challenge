import { AppError } from '../../shared/errors/AppError';
import { ProductsRepository } from './products.repository';

interface ListParams {
  page: number;
  pageSize: number;
  category?: string;
  search?: string;
}

const repo = new ProductsRepository();

export class ProductsService {
  list(params: ListParams) {
    const { rows, total } = repo.findAll(params);
    const totalPages = Math.ceil(total / params.pageSize);
    return {
      data: rows,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages,
      },
    };
  }

  findById(id: number) {
    const product = repo.findById(id);
    if (!product) throw AppError.notFound('Producto');
    return product;
  }
}
