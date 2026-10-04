import type { Request, Response } from 'express';
import { requireUser } from '../../middlewares/auth.js';
import { ok } from '../../shared/responses.js';
import { parseBody, parseParams } from '../../shared/validate.js';
import { addCartItemBody, productIdParam, updateCartItemBody } from './cart.schema.js';
import type { CartService } from './cart.service.js';

export function createCartController(service: CartService) {
  return {
    getCart(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const cart = service.getCart(userId);
      ok(res, cart);
    },

    addItem(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const body = parseBody(addCartItemBody, req);
      const cart = service.addItem(userId, body);
      ok(res, cart);
    },

    updateItem(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const { productId } = parseParams(productIdParam, req);
      const { quantity } = parseBody(updateCartItemBody, req);
      const cart = service.updateItem(userId, productId, quantity);
      ok(res, cart);
    },

    removeItem(req: Request, res: Response): void {
      const { id: userId } = requireUser(req);
      const { productId } = parseParams(productIdParam, req);
      const cart = service.removeItem(userId, productId);
      ok(res, cart);
    },
  };
}
