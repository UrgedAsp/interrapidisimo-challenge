import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { checkout, getMyOrders } from './orders.controller';

export const ordersRouter = Router();
ordersRouter.use(authenticate);
ordersRouter.post('/checkout', checkout);
ordersRouter.get('/', getMyOrders);
