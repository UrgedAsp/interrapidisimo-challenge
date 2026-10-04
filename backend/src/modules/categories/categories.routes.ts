import { Router } from 'express';
import { getCategories } from './categories.controller';

export const categoriesRouter = Router();

categoriesRouter.get('/', getCategories);
