import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { OrdersService } from './orders.service';

const service = new OrdersService();

export function checkout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = service.checkout(req.userId!);
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
}

export function getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orders = service.listByUser(req.userId!);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
}
