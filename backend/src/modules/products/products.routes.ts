import { Router } from 'express';
import { getProducts, getProductById } from './products.controller';

export const productsRouter = Router();

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
