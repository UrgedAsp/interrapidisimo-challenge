import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { getMyPoints } from './rewards.controller';

export const rewardsRouter = Router();
rewardsRouter.use(authenticate);
rewardsRouter.get('/me', getMyPoints);
