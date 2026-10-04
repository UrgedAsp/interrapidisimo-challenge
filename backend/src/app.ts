import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { favoritesRouter } from './modules/favorites/favorites.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { rewardsRouter } from './modules/rewards/rewards.routes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/rewards', rewardsRouter);

app.use(errorMiddleware);

export default app;
