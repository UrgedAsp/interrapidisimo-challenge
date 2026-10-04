import { cartItemNotFound, outOfStock, productNotFound } from '../../shared/errors.js';
import type { Cart } from '../../shared/types.js';
import type { CartRepository } from './cart.repository.js';

export function createCartService(repository: CartRepository) {
  return {
    getCart(userId: number): Cart {
      return repository.getCartWithItems(userId);
    },

    addItem(userId: number, input: { productId: number; quantity: number }): Cart {
      const cartRow = repository.getOrCreateOpenCart(userId);
      const product = repository.findProduct(input.productId);

      if (!product) {
        throw productNotFound(input.productId);
      }

      const existing = repository.findCartItem(cartRow.id, input.productId);
      const newQuantity = (existing?.quantity ?? 0) + input.quantity;

      if (newQuantity > product.stock) {
        throw outOfStock(product.id, 'Sin stock suficiente');
      }

      repository.upsertItem(cartRow.id, input.productId, newQuantity);
      return repository.getCartWithItems(userId);
    },

    updateItem(userId: number, productId: number, quantity: number): Cart {
      const cartRow = repository.getOrCreateOpenCart(userId);
      const existing = repository.findCartItem(cartRow.id, productId);

      if (!existing) {
        throw cartItemNotFound(productId);
      }

      const product = repository.findProduct(productId);
      if (!product || quantity > product.stock) {
        throw outOfStock(productId, 'Sin stock suficiente');
      }

      repository.updateItemQuantity(cartRow.id, productId, quantity);
      return repository.getCartWithItems(userId);
    },

    removeItem(userId: number, productId: number): Cart {
      const cartRow = repository.getOrCreateOpenCart(userId);
      repository.removeItem(cartRow.id, productId);
      return repository.getCartWithItems(userId);
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
