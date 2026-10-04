import type { AccessTokenPayload } from '../shared/jwt.js';

declare global {
  namespace Express {
    interface Request {
      /** Lo deja `authenticate`. Su ausencia significa "petición sin token". */
      user?: AccessTokenPayload;
    }
  }
}

export {};
