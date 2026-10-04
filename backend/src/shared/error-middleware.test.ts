import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from './errors.js';
import { errorHandler, notFound } from './error-middleware.js';
import { ok, okList } from './responses.js';

/**
 * Tests del middleware de errores contra una app mínima, para poder registrar
 * rutas que fallan de forma controlada. La app real no expone rutas de prueba.
 */
function testApp(register?: (api: express.Router) => void) {
  const app = express();
  app.use(express.json());

  const api = express.Router();
  register?.(api);
  app.use('/api', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('convierte un error no controlado en 500 INTERNAL_ERROR sin filtrar nada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = testApp((api) => {
      api.get('/falla', () => {
        throw new Error('SECRETO: host 10.0.0.5, tabla users, clave hunter2');
      });
    });

    const response = await request(app).get('/api/falla');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error inesperado. Intenta de nuevo.',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('SECRETO');
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(response.body.error).not.toHaveProperty('details');
    expect(response.body.error).not.toHaveProperty('stack');
  });

  it('registra el error real en el log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = testApp((api) => {
      api.get('/falla', () => {
        throw new Error('fallo interno');
      });
    });

    await request(app).get('/api/falla');

    expect(spy).toHaveBeenCalledOnce();
  });

  it('trata igual una promesa rechazada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = testApp((api) => {
      api.get('/falla', async () => {
        await Promise.resolve();
        throw new Error('fallo asíncrono');
      });
    });

    const response = await request(app).get('/api/falla');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('deja pasar un AppError con su status, code, message y details', async () => {
    const app = testApp((api) => {
      api.get('/falla', () => {
        throw new AppError(409, 'OUT_OF_STOCK', 'Sin stock suficiente', [
          { productId: 7, message: 'Solo quedan 2 unidades' },
        ]);
      });
    });

    const response = await request(app).get('/api/falla');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'OUT_OF_STOCK',
        message: 'Sin stock suficiente',
        details: [{ productId: 7, message: 'Solo quedan 2 unidades' }],
      },
    });
  });

  it('omite details cuando el AppError no los trae', async () => {
    const app = testApp((api) => {
      api.get('/falla', () => {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe');
      });
    });

    const response = await request(app).get('/api/falla');

    expect(response.body.error).not.toHaveProperty('details');
  });

  it('convierte un ZodError en 422 VALIDATION_ERROR con details por campo', async () => {
    const app = testApp((api) => {
      api.post('/validar', () => {
        const schema = z.strictObject({
          email: z.email('Debe ser un correo válido'),
          quantity: z.coerce.number().int().min(1, 'Debe ser 1 o más'),
        });
        schema.parse({ email: 'no-es-correo', quantity: 0, points: 99 });
      });
    });

    const response = await request(app)
      .post('/api/validar')
      .send({ email: 'no-es-correo', quantity: 0, points: 99 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Datos inválidos');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'email', message: 'Debe ser un correo válido' },
        { field: 'quantity', message: 'Debe ser 1 o más' },
      ]),
    );
  });

  it('los details son siempre un arreglo', async () => {
    const app = testApp((api) => {
      api.post('/validar', () => {
        z.strictObject({ quantity: z.number() }).parse({});
      });
    });

    const response = await request(app).post('/api/validar').send({});

    expect(Array.isArray(response.body.error.details)).toBe(true);
  });
});

describe('notFound', () => {
  it('responde 404 ROUTE_NOT_FOUND', async () => {
    const response = await request(testApp()).get('/api/no-existe');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'El endpoint solicitado no existe' },
    });
  });
});

describe('helpers de éxito (§2, §6)', () => {
  it('ok() produce { data }', async () => {
    const app = testApp((api) => {
      api.get('/ok', (_req, res) => ok(res, { id: 1 }));
    });

    const response = await request(app).get('/api/ok');

    expect(response.body).toEqual({ data: { id: 1 } });
  });

  it('okList() produce { data, meta }', async () => {
    const app = testApp((api) => {
      api.get('/lista', (_req, res) =>
        okList(res, [{ id: 1 }], { page: 1, pageSize: 12, total: 1, totalPages: 1 }),
      );
    });

    const response = await request(app).get('/api/lista');

    expect(response.body).toEqual({
      data: [{ id: 1 }],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    });
  });

  it('okList() admite lista vacía con meta real', async () => {
    const app = testApp((api) => {
      api.get('/lista', (_req, res) => okList(res, [], { page: 3, pageSize: 12, total: 20, totalPages: 2 }));
    });

    const response = await request(app).get('/api/lista');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 3, pageSize: 12, total: 20, totalPages: 2 });
  });
});
