import type { Request, Response } from 'express';
import { requireUser } from '../../middlewares/auth.js';
import { ok } from '../../shared/responses.js';
import { parseBody } from '../../shared/validate.js';
import { loginBody } from './auth.schema.js';
import type { AuthService } from './auth.service.js';

export function createAuthController(service: AuthService) {
  return {
    login: async (req: Request, res: Response): Promise<void> => {
      const credentials = parseBody(loginBody, req);

      // Express 5 manda a `errorHandler` lo que rechace un handler `async`, así
      // que `parseBody` y `service.login` lanzan sin try/catch.
      ok(res, await service.login(credentials));
    },

    me: (req: Request, res: Response): void => {
      const { id: userId } = requireUser(req);

      ok(res, service.me(userId));
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
