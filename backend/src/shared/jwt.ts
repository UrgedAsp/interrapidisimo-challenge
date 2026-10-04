import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Identidad del usuario autenticado. `sub` es el id del usuario y siempre sale
 * del token verificado, nunca del cuerpo, la query o la URL (§1).
 */
export type AccessTokenPayload = { sub: number; email: string };

const ALGORITHM = 'HS256' as const;

export function signToken(user: { id: number; email: string }): string {
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: ALGORITHM,
  });
}

export function verifyToken(token: string): AccessTokenPayload {
  // `algorithms` fijo: sin esto un atacante podría ofrecer `alg: none` o un
  // algoritmo asimétrico y cambiar la verificación a su favor.
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });

  if (typeof payload === 'string') {
    throw new jwt.JsonWebTokenError('El token no contiene un payload válido');
  }

  const sub = Number(payload.sub);

  if (!Number.isInteger(sub) || sub <= 0) {
    throw new jwt.JsonWebTokenError('El token no identifica a un usuario válido');
  }

  return { sub, email: String(payload.email ?? '') };
}
