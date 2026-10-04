import { AppError } from '../../shared/errors/AppError';
import { CartRepository } from './cart.repository';
import { ProductsRepository } from '../products/products.repository';

const cartRepo = new CartRepository();
const productsRepo = new ProductsRepository();

export class CartService {
  getCart(userId: number) {
    return cartRepo.getOrCreateCart(userId);
  }

  addItem(userId: number, productId: number, quantity: number) {
    const product = productsRepo.findById(productId);
    if (!product) throw AppError.notFound('Producto');
    if (product.stock < quantity) {
      throw AppError.unprocessable('OUT_OF_STOCK', 'Sin stock suficiente');
    }

    const cart = cartRepo.getOrCreateCart(userId);
    cartRepo.upsertItem(cart.id, productId, quantity);
    return cartRepo.getOrCreateCart(userId);
  }

  updateItem(userId: number, productId: number, quantity: number) {
    if (quantity === 0) {
      return this.removeItem(userId, productId);
    }

    const product = productsRepo.findById(productId);
    if (!product) throw AppError.notFound('Producto');
    if (product.stock < quantity) {
      throw AppError.unprocessable('OUT_OF_STOCK', 'Sin stock suficiente');
    }

    const cart = cartRepo.getOrCreateCart(userId);
    cartRepo.setItemQuantity(cart.id, productId, quantity);
    return cartRepo.getOrCreateCart(userId);
  }

  removeItem(userId: number, productId: number) {
    const cart = cartRepo.getOrCreateCart(userId);
    cartRepo.removeItem(cart.id, productId);
    return cartRepo.getOrCreateCart(userId);
  }
}
