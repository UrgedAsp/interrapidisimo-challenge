import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from './errors.js';
import { verifyToken } from './jwt.js';

/**
 * Middleware de autenticación (§1). Deja `req.user` y, si el token falta, está
 * vencido o es inválido, responde 401 UNAUTHORIZED. Los tres casos comparten
 * código a propósito: el cliente no necesita distinguir el motivo, solo saber
 * que debe volver a iniciar sesión.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    next(unauthorized('Inicia sesión para continuar'));
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? 'Tu sesión expiró. Inicia sesión de nuevo.'
        : 'El token de sesión no es válido.';

    next(unauthorized(message));
  }
};
