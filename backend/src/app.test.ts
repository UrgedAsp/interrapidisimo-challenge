import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createTestDatabase } from './db/testing.js';
import { signToken } from './shared/jwt.js';

// Base en memoria: estas pruebas solo miran la forma de la respuesta y el guard,
// así que no necesitan el seed.
const app = () => createApp(createTestDatabase());

const validToken = () => signToken(42);

describe('contrato de respuestas (sección 2)', () => {
  it('envuelve el éxito en { data }', async () => {
    const response = await request(app()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });

  it('nunca devuelve data junto a error', async () => {
    const response = await request(app()).get('/api/ruta-inexistente');

    expect(response.body).not.toHaveProperty('data');
    expect(response.body).not.toHaveProperty('meta');
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('un 404 de ruta usa el contrato de error, incluso fuera de /api', async () => {
    const response = await request(app()).get('/otra-ruta');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'El endpoint solicitado no existe' },
    });
  });

  it('el 404 de ruta no expone detalles si el error los trae', async () => {
    const response = await request(app()).get('/api/ruta-inexistente').set('Authorization', `Bearer ${validToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'El endpoint solicitado no existe' },
    });
  });
});

describe('autenticación (sección 1, sección 4)', () => {
  it('rechaza sin cabecera Authorization', async () => {
    const response = await request(app()).get('/api/privado');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Inicia sesión para continuar' },
    });
  });

  it.each([
    ['sin prefijo Bearer', validToken()],
    ['con esquema incorrecto', `Basic ${validToken()}`],
    ['con token vacío', 'Bearer '],
    ['con token falso', 'Bearer no-es-un-jwt'],
  ])('rechaza un token %s', async (_caso, authorization) => {
    const response = await request(app()).get('/api/privado').set('Authorization', authorization);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const response = await request(app())
      .get('/api/privado')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.otro-secreto');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('deja pasar un token válido', async () => {
    const response = await request(app())
      .get('/api/ruta-inexistente')
      .set('Authorization', `Bearer ${validToken()}`);

    // Llega al notFound, lo que prueba que `authenticate` lo dejó continuar.
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('deja /health pública sin token', async () => {
    const response = await request(app()).get('/api/health');

    expect(response.status).toBe(200);
  });
});

describe('JSON mal formado (sección 5)', () => {
  it('responde 400 BAD_REQUEST si el cuerpo no es JSON', async () => {
    const response = await request(app())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'El cuerpo de la petición no es JSON válido' },
    });
  });
});

describe('CORS (sección 1)', () => {
  it('habilita el origen del frontend configurado', async () => {
    const response = await request(app()).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('no emite la cabecera para otros orígenes', async () => {
    const response = await request(app()).get('/api/health').set('Origin', 'https://sitio-malicioso.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
