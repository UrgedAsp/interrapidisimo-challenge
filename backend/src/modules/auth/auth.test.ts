import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import { signToken } from '../../shared/jwt.js';
import type { ApiErrorBody, ApiSuccess, LoginResult, User } from '../../shared/types.js';

const CREDENCIALES = { email: 'ana@tienda.co', password: 'ClaveDemo123' };

let db: DatabaseConnection;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = createSeededDatabase();
  app = createApp(db);
});

const post = (body: Record<string, unknown>) =>
  request(app).post('/api/auth/login').send(body);
const me = (token?: string) => {
  const call = request(app).get('/api/me');
  return token ? call.set('Authorization', `Bearer ${token}`) : call;
};

/** El usuario de las credenciales, tal como quedó en la base sembrada. */
const anaEnLaBase = () =>
  db
    .prepare<[string], { id: number; points_balance: number }>(
      'SELECT id, points_balance FROM users WHERE email = ?',
    )
    .get(CREDENCIALES.email)!;

describe('POST /api/auth/login (§4.1)', () => {
  it('devuelve token y usuario dentro de { data }', async () => {
    const response = await post(CREDENCIALES);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data.user).toEqual({
      id: anaEnLaBase().id,
      name: 'Ana Restrepo',
      email: CREDENCIALES.email,
      pointsBalance: 0,
    });
  });

  it('el token identifica al usuario y permite leer /me', async () => {
    const login = await post(CREDENCIALES);
    const { token } = login.body.data satisfies LoginResult;

    const response = await me(token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: login.body.data.user });
  });

  it('acepta el correo en cualquier combinación de mayúsculas', async () => {
    const response = await post({ ...CREDENCIALES, email: '  ANA@TIENDA.CO  ' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(CREDENCIALES.email);
  });

  it('rechaza una contraseña incorrecta con INVALID_CREDENTIALS', async () => {
    const response = await post({ ...CREDENCIALES, password: 'NoEsLaClave' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos' },
    });
  });

  it('responde exactamente lo mismo si el correo no existe', async () => {
    const response = await post({ ...CREDENCIALES, email: 'nadie@tienda.co' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos' },
    });
  });

  it('no revela qué correos están registrados', async () => {
    // Los dos fallos son indistinguibles: mismo status, mismo code y mismo
    // mensaje. Es el criterio de §4.1 sobre el mensaje único.
    const inexistente = await post({
      email: 'nadie@tienda.co',
      password: CREDENCIALES.password,
    });
    const malaClave = await post({ ...CREDENCIALES, password: 'NoEsLaClave' });

    expect(inexistente.status).toBe(malaClave.status);
    expect(inexistente.body.error.message).toBe(malaClave.body.error.message);
  });
});

describe('validación del cuerpo de login (§1, §5)', () => {
  it.each([
    ['correo ausente', { password: 'ClaveDemo123' }, 'email'],
    ['contraseña ausente', { email: CREDENCIALES.email }, 'password'],
    ['correo con formato inválido', { ...CREDENCIALES, email: 'no-es-correo' }, 'email'],
    ['contraseña vacía', { ...CREDENCIALES, password: '' }, 'password'],
    ['contraseña de más de 128 caracteres', { ...CREDENCIALES, password: 'a'.repeat(129) }, 'password'],
  ])('devuelve 422 con details por campo: %s', async (_caso, body, field) => {
    const response = await post(body);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });

  it('rechaza campos desconocidos, incluido points', async () => {
    const response = await post({ ...CREDENCIALES, points: 999_999 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/me (§4.1)', () => {
  it('devuelve el usuario del token', async () => {
    const response = await me(signToken(anaEnLaBase().id)).expect(
      200,
    );

    expect(response.body satisfies ApiSuccess<User>).toEqual({
      data: {
        id: anaEnLaBase().id,
        name: 'Ana Restrepo',
        email: CREDENCIALES.email,
        pointsBalance: 0,
      },
    });
  });

  it('sin token responde UNAUTHORIZED', async () => {
    const response = await me();

    expect(response.status).toBe(401);
    expect((response.body as ApiErrorBody).error.code).toBe('UNAUTHORIZED');
  });

  it('lee el saldo de la base, no el del token', async () => {
    // El token solo lleva el id, así que si /me no consultara la base no
    // podría devolver el saldo: el indicador de puntos arrancaría en cero.
    const token = signToken(anaEnLaBase().id);
    db.prepare('UPDATE users SET points_balance = 250 WHERE id = ?').run(anaEnLaBase().id);

    const response = await me(token);

    expect(response.status).toBe(200);
    expect(response.body.data.pointsBalance).toBe(250);
  });

  it('un token de un usuario que ya no existe responde UNAUTHORIZED', async () => {
    const token = signToken(9999);

    const response = await me(token);

    // La firma era válida, así que el guard lo dejó pasar; el 401 lo decide el
    // service al no encontrar el usuario.
    expect(response.status).toBe(401);
    expect((response.body as ApiErrorBody).error.code).toBe('UNAUTHORIZED');
  });

  it('el saldo de cada usuario es el suyo, no el de otro', async () => {
    const carlos = db
      .prepare<[string], { id: number }>('SELECT id FROM users WHERE email = ?')
      .get('carlos@tienda.co')!;
    db.prepare('UPDATE users SET points_balance = 77 WHERE id = ?').run(carlos.id);

    const response = await me(signToken(carlos.id));

    expect(response.body.data.pointsBalance).toBe(77);
  });
});

describe('tokens rechazados por el middleware (§7)', () => {
  const firmar = (payload: object, options: jwt.SignOptions = {}) =>
    jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });

  it('token vencido', async () => {
    const response = await me(firmar({ sub: String(anaEnLaBase().id) }, { expiresIn: '-1s' }));

    expect(response.status).toBe(401);
    expect((response.body as ApiErrorBody).error.code).toBe('UNAUTHORIZED');
  });

  it('token firmado con otro secreto', async () => {
    const token = jwt.sign({ sub: '1' }, 'secreto-del-atacante', { algorithm: 'HS256' });

    expect((await me(token)).status).toBe(401);
  });

  it('token con "alg: none"', async () => {
    const token = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: '1' }),
    ).toString('base64url')}.`;

    expect((await me(token)).status).toBe(401);
  });

  it('todos los fallos de token comparten el mismo mensaje', async () => {
    // §5 pide un mensaje genérico: distinguir "vencido" de "inválido" le diría a
    // quien tenga el token cuándo se emitió.
    const respuestas = await Promise.all([
      me(),
      me('no-es-un-jwt'),
      me(firmar({ sub: '1' }, { expiresIn: '-1s' })),
      me(jwt.sign({ sub: '1' }, 'otro-secreto', { algorithm: 'HS256' })),
    ]);

    const cuerpos = respuestas.map((r) => JSON.stringify((r.body as ApiErrorBody).error));

    expect(respuestas.every((r) => r.status === 401)).toBe(true);
    expect(new Set(cuerpos).size).toBe(1);
  });

  it('una ruta protegida cualquiera responde 401 sin token', async () => {
    const response = await request(app).get('/api/products');

    // Todavía no existe (§4.2 llega en el commit de products), pero el guard ya
    // corre antes que cualquier ruta, así que el 401 sale igual.
    expect(response.status).toBe(401);
    expect((response.body as ApiErrorBody).error.code).toBe('UNAUTHORIZED');
  });
});
