import type { Category } from '../../shared/types.js';
import type { CategoriesRepository } from './categories.repository.js';

/**
 * El listado de categorías existe para que el cliente arme el filtro sin escribir
 * ningún nombre a mano (§5). Si el catálogo de la base y el filtro del cliente
 * pueden discrepar, el filtro ofrece opciones que devuelven vacío.
 */
export function createCategoriesService(repository: CategoriesRepository) {
  return {
    list(): Category[] {
      return repository.list();
    },
  };
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
