import { AppError } from '../../shared/errors/AppError';
import { FavoritesRepository } from './favorites.repository';
import { ProductsRepository } from '../products/products.repository';
import { RewardsRepository } from '../rewards/rewards.repository';

const favRepo = new FavoritesRepository();
const productsRepo = new ProductsRepository();
const rewardsRepo = new RewardsRepository();

// Puntos por marcar favorito: 5
const POINTS_PER_FAVORITE = 5;

export class FavoritesService {
  list(userId: number) {
    return favRepo.findByUser(userId);
  }

  add(userId: number, productId: number) {
    const product = productsRepo.findById(productId);
    if (!product) throw AppError.notFound('Producto');

    const alreadyFav = favRepo.exists(userId, productId);
    if (alreadyFav) throw AppError.conflict('ALREADY_FAVORITE', 'Ya está en favoritos');

    favRepo.add(userId, productId);

    // Otorgar puntos por favorito
    rewardsRepo.addPoints(userId, POINTS_PER_FAVORITE, 'FAVORITE', productId);

    const updatedUser = rewardsRepo.getPoints(userId);
    return { productId, points: updatedUser };
  }

  remove(userId: number, productId: number) {
    favRepo.remove(userId, productId);
  }
}
