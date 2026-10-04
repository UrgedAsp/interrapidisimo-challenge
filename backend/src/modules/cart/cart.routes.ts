import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { getCart, addItem, updateItem, removeItem } from './cart.controller';

export const cartRouter = Router();

cartRouter.use(authenticate);
cartRouter.get('/', getCart);
cartRouter.post('/items', addItem);
cartRouter.patch('/items/:productId', updateItem);
cartRouter.delete('/items/:productId', removeItem);
