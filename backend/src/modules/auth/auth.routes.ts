import { Router } from 'express';
import { createAuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

/**
 * Login es el único endpoint público del API (sección 1), así que sus rutas se montan
 * antes del guard `authenticate` y las de `/me` después. Viven en el mismo
 * archivo para que quede a la vista que las dos mitades son un módulo y que el
 * límite entre ellas es el guard, no una frontera de archivos.
 */

/** Rutas públicas. Se montan antes de `authenticate`. */
export function createPublicAuthRoutes(service: AuthService): Router {
  const router = Router();
  const controller = createAuthController(service);

  router.post('/auth/login', controller.login);

  return router;
}

/** Rutas que exigen token. Se montan después de `authenticate`. */
export function createProtectedAuthRoutes(service: AuthService): Router {
  const router = Router();
  const controller = createAuthController(service);

  router.get('/me', controller.me);

  return router;
}
