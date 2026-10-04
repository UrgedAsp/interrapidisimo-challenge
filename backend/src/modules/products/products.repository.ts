import db from '../../db/database';

interface ProductRow {
  id: number;
  category_id: number;
  category_slug: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  rating: number;
}

interface ListParams {
  page: number;
  pageSize: number;
  category?: string;
  search?: string;
}

export class ProductsRepository {
  findAll(params: ListParams): { rows: ProductRow[]; total: number } {
    const { page, pageSize, category, search } = params;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: unknown[] = [];

    if (category) {
      conditions.push('c.slug = ?');
      args.push(category);
    }
    if (search) {
      conditions.push('p.name LIKE ?');
      args.push(`%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ${where}`
      )
      .get(...args) as { total: number };

    const rows = db
      .prepare(
        `SELECT p.*, c.slug as category_slug, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ${where}
         ORDER BY p.id
         LIMIT ? OFFSET ?`
      )
      .all(...args, pageSize, offset) as ProductRow[];

    return { rows, total: countRow.total };
  }

  findById(id: number): ProductRow | undefined {
    return db
      .prepare(
        `SELECT p.*, c.slug as category_slug, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(id) as ProductRow | undefined;
  }

  decrementStock(id: number, quantity: number) {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, id);
  }
}
