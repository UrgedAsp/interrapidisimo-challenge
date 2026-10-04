import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import type { FavoriteResult, Product } from '../../shared/types.js';

let db: DatabaseConnection;
let app: ReturnType<typeof createApp>;
let tokenUser1: string;
let tokenUser2: string;

beforeEach(async () => {
  db = createSeededDatabase();
  app = createApp(db);

  const login1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@tienda.co', password: 'ClaveDemo123' });
  tokenUser1 = login1.body.data.token;

  const login2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'carlos@tienda.co', password: 'ClaveDemo123' });
  tokenUser2 = login2.body.data.token;
});

const getFavorites = (token?: string) => {
  const req = request(app).get('/api/favorites');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const putFavorite = (productId: number | string, token?: string) => {
  const req = request(app).put(`/api/favorites/${productId}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const deleteFavorite = (productId: number | string, token?: string) => {
  const req = request(app).delete(`/api/favorites/${productId}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('Módulo de Favoritos (§5 y §7 de 10-backend-favorites.md)', () => {
  it('GET /api/favorites de un usuario nuevo devuelve data: []', async () => {
    const res = await getFavorites(tokenUser1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('primer PUT de un producto otorga 2 puntos y sube el saldo', async () => {
    const res = await putFavorite(1, tokenUser1);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      productId: 1,
      isFavorite: true,
      pointsAwarded: 2,
      pointsBalance: 2,
    } satisfies FavoriteResult);

    const me = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenUser1}`);
    expect(me.body.data.pointsBalance).toBe(2);
  });

  it('segundo PUT del mismo producto devuelve pointsAwarded: 0 y mantiene el saldo', async () => {
    await putFavorite(1, tokenUser1);
    const res = await putFavorite(1, tokenUser1);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      productId: 1,
      isFavorite: true,
      pointsAwarded: 0,
      pointsBalance: 2,
    });
  });

  it('tras marcar dos productos, el listado los devuelve con forma Product, isFavorite: true y el más reciente primero', async () => {
    await putFavorite(1, tokenUser1);
    await putFavorite(2, tokenUser1);

    const res = await getFavorites(tokenUser1);
    expect(res.status).toBe(200);
    const favorites = res.body.data as Product[];
    expect(favorites).toHaveLength(2);
    expect(favorites[0]!.id).toBe(2); // El más reciente
    expect(favorites[1]!.id).toBe(1);
    expect(favorites[0]!.isFavorite).toBe(true);
    expect(favorites[1]!.isFavorite).toBe(true);
    expect(favorites[0]!.category).toBeDefined();
  });

  it('PUT, DELETE y PUT otra vez: el segundo PUT da 0 puntos', async () => {
    const res1 = await putFavorite(1, tokenUser1);
    expect(res1.body.data.pointsAwarded).toBe(2);

    const resDel = await deleteFavorite(1, tokenUser1);
    expect(resDel.status).toBe(200);
    expect(resDel.body.data).toEqual({
      productId: 1,
      isFavorite: false,
      pointsAwarded: 0,
      pointsBalance: 2,
    });

    const res2 = await putFavorite(1, tokenUser1);
    expect(res2.status).toBe(200);
    expect(res2.body.data).toEqual({
      productId: 1,
      isFavorite: true,
      pointsAwarded: 0,
      pointsBalance: 2,
    });
  });

  it('alternar un favorito 10 veces suma 2 puntos en total', async () => {
    for (let i = 0; i < 10; i++) {
      await putFavorite(1, tokenUser1);
      await deleteFavorite(1, tokenUser1);
    }

    const me = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenUser1}`);
    expect(me.body.data.pointsBalance).toBe(2);

    // Ledger contiene una sola fila
    const count = db.prepare(
      "SELECT COUNT(*) AS total FROM points_ledger WHERE user_id = 1 AND action = 'FAVORITE'",
    ).get() as { total: number };
    expect(count.total).toBe(1);
  });

  it('DELETE de un producto no marcado y DELETE repetido devuelve 200 sin error', async () => {
    const res1 = await deleteFavorite(999, tokenUser1);
    expect(res1.status).toBe(200);
    expect(res1.body.data.isFavorite).toBe(false);

    const res2 = await deleteFavorite(999, tokenUser1);
    expect(res2.status).toBe(200);
  });

  it('PUT de un producto inexistente responde 404 PRODUCT_NOT_FOUND', async () => {
    const res = await putFavorite(99999, tokenUser1);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('productId inválido responde 422 VALIDATION_ERROR', async () => {
    const res = await putFavorite('abc', tokenUser1);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const res0 = await putFavorite(0, tokenUser1);
    expect(res0.status).toBe(422);

    const resNeg = await putFavorite(-3, tokenUser1);
    expect(resNeg.status).toBe(422);
  });

  it('un producto sin stock se puede marcar como favorito', async () => {
    db.prepare('UPDATE products SET stock = 0 WHERE id = 1').run();
    const res = await putFavorite(1, tokenUser1);

    expect(res.status).toBe(200);
    expect(res.body.data.isFavorite).toBe(true);
    expect(res.body.data.pointsAwarded).toBe(2);
  });

  it('los favoritos de un usuario no aparecen para otro', async () => {
    await putFavorite(1, tokenUser1);

    const favsUser1 = await getFavorites(tokenUser1);
    expect(favsUser1.body.data).toHaveLength(1);

    const favsUser2 = await getFavorites(tokenUser2);
    expect(favsUser2.body.data).toHaveLength(0);

    // En el listado de productos, isFavorite refleja solo el usuario autenticado
    const prodRes1 = await request(app).get('/api/products').set('Authorization', `Bearer ${tokenUser1}`);
    const prodRes2 = await request(app).get('/api/products').set('Authorization', `Bearer ${tokenUser2}`);

    const p1 = (prodRes1.body.data as Product[]).find((p) => p.id === 1);
    const p2 = (prodRes2.body.data as Product[]).find((p) => p.id === 1);

    expect(p1?.isFavorite).toBe(true);
    expect(p2?.isFavorite).toBe(false);
  });

  it('marcar o quitar favoritos no afecta al carrito', async () => {
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: 1, quantity: 2 });

    await putFavorite(1, tokenUser1);
    await deleteFavorite(1, tokenUser1);

    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${tokenUser1}`);
    expect(cartRes.body.data.itemCount).toBe(2);
  });

  it('invariante: points_balance coincide con SUM(points_ledger) tras cualquier secuencia', async () => {
    await putFavorite(1, tokenUser1);
    await putFavorite(2, tokenUser1);
    await putFavorite(3, tokenUser1);
    await deleteFavorite(2, tokenUser1);

    const userRow = db.prepare('SELECT points_balance FROM users WHERE id = 1').get() as { points_balance: number };
    const ledgerSum = db.prepare('SELECT SUM(points) AS total FROM points_ledger WHERE user_id = 1').get() as { total: number };

    expect(userRow.points_balance).toBe(ledgerSum.total);
    expect(userRow.points_balance).toBe(6);
  });

  it('sin token responde 401 UNAUTHORIZED en todas las rutas de favoritos', async () => {
    const resGet = await getFavorites();
    expect(resGet.status).toBe(401);

    const resPut = await putFavorite(1);
    expect(resPut.status).toBe(401);

    const resDel = await deleteFavorite(1);
    expect(resDel.status).toBe(401);
  });
});
