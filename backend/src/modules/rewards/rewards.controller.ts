import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { RewardsRepository } from './rewards.repository';

const repo = new RewardsRepository();

export function getMyPoints(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const points = repo.getPoints(req.userId!);
    const ledger = repo.getLedger(req.userId!);
    res.json({ data: { points, ledger } });
  } catch (err) {
    next(err);
  }
}
