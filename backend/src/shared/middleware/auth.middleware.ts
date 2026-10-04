import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';

export interface AuthRequest extends Request {
  userId?: number;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token requerido'));
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET ?? 'dev_secret';
    const payload = jwt.verify(token, secret) as { sub: number };
    req.userId = payload.sub;
    next();
  } catch {
    next(AppError.unauthorized('Token inválido o expirado'));
  }
}
