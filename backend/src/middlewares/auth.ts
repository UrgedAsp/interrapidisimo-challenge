import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../shared/errors.js';
import { verifyToken, type AuthenticatedUser } from '../shared/jwt.js';

/**
 * Middleware de autenticación (sección 5 de `10-backend-auth.md`). Deja `req.user` y, si
 * el token falta, está vencido o es inválido, responde 401 UNAUTHORIZED.
 *
 * Los tres casos comparten mensaje a propósito: el cliente solo necesita saber
 * que debe volver a iniciar sesión, y un mensaje que distinguiera "vencido" de
 * "inválido" le diría a quien tenga el token cuándo fue emitido.
 *
 * No se consulta la base en cada petición. El token solo prueba que la firma es
 * nuestra; el usuario se relee cuando una ruta necesita sus datos, como en
 * `GET /api/me`.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    next(unauthorized());
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(unauthorized());
  }
};

/**
 * `req.user` para los controllers. Lanza en vez de devolver `undefined` para que
 * un endpoint protegido al que se le olvidara montar el guard falle con un 401
 * coherente en lugar de un TypeError convertido en 500.
 */
export function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw unauthorized();
  }

  return req.user;
}
