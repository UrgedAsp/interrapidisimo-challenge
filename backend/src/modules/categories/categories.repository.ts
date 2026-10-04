import db from '../../db/database';

interface CategoryRow {
  id: number;
  slug: string;
  name: string;
}

export class CategoriesRepository {
  findAll(): CategoryRow[] {
    return db.prepare('SELECT * FROM categories ORDER BY name').all() as CategoryRow[];
  }
}
