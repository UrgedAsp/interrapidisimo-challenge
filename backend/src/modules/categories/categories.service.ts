import { CategoriesRepository } from './categories.repository';

const repo = new CategoriesRepository();

export class CategoriesService {
  list() {
    return repo.findAll();
  }
}
