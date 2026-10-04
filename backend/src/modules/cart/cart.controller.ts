import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { CartService } from './cart.service';

const service = new CartService();

const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

export function getCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cart = service.getCart(req.userId!);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export function addItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = addItemSchema.parse(req.body);
    const cart = service.addItem(req.userId!, body.productId, body.quantity);
    res.status(201).json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export function updateItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId);
    const { quantity } = updateItemSchema.parse(req.body);
    const cart = service.updateItem(req.userId!, productId, quantity);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}

export function removeItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const productId = Number(req.params.productId);
    const cart = service.removeItem(req.userId!, productId);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
}
