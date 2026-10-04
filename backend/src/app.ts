import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import type { DatabaseConnection } from './db/database.js';
import {
  createProtectedAuthRoutes,
  createPublicAuthRoutes,
} from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { authenticate } from './middlewares/auth.js';
import { errorHandler, notFound } from './shared/error-middleware.js';
import { ok } from './shared/responses.js';

/**
 * Todas las rutas cuelgan de `/api` (§1). El orden de los middlewares importa:
 *
 * 1. CORS y parser de JSON, antes de todo.
 * 2. Rutas públicas.
 * 3. `authenticate`: a partir de aquí todo lo registrado debajo exige token
 *    (§1: el único endpoint público es `POST /api/auth/login`). Se deja el guard
 *    en un solo lugar en vez de repetirlo ruta por ruta para que olvidar
 *    proteger un endpoint sea difícil.
 * 4. `notFound` y `errorHandler` al final, siempre.
 */
export function createApp(db: DatabaseConnection) {
  const app = express();

  // Con un origen fijo, `cors` emitiría la cabecera para cualquiera y dejaría
  // decidir al navegador. Solo se emite para el origen configurado, que es lo
  // que pide "CORS habilitado solo para el origen del frontend".
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(null, !requestOrigin || requestOrigin === env.FRONTEND_ORIGIN);
      },
    }),
  );
  app.use(express.json());

  const api = express.Router();
  const authService = createAuthService(db);

  api.get('/health', (_req, res) => {
    ok(res, { status: 'ok' });
  });

  // El service se crea una vez y se comparte entre las dos mitades del módulo.
  api.use(createPublicAuthRoutes(authService));

  api.use(authenticate);

  api.use(createProtectedAuthRoutes(authService));

  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
