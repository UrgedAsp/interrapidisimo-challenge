import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Identidad del usuario autenticado. Solo el id: sale del token verificado,
 * nunca del cuerpo, la query o la URL (sección 1 de `02-api-contract.md`).
 */
export type AuthenticatedUser = { id: number };

const ALGORITHM = 'HS256' as const;

/**
 * sección 5 de `10-backend-auth.md`: el payload lleva únicamente `sub`. El correo, el
 * saldo y cualquier dato personal se leen de la base cuando hacen falta, para que
 * un token robado no sirva para averiguar el correo de nadie ni para conocer un
 * saldo que ya cambió.
 */
export function signToken(userId: number): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: ALGORITHM,
  });
}

export function verifyToken(token: string): AuthenticatedUser {
  // `algorithms` fijo: sin esto un atacante podría ofrecer `alg: none` o un
  // algoritmo asimétrico y cambiar la verificación a su favor.
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });

  if (typeof payload === 'string') {
    throw new jwt.JsonWebTokenError('El token no contiene un payload válido');
  }

  const id = Number(payload.sub);

  if (!Number.isInteger(id) || id <= 0) {
    throw new jwt.JsonWebTokenError('El token no identifica a un usuario válido');
  }

  return { id };
}
