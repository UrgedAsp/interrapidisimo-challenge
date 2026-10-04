import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import type { ApiErrorBody, ApiSuccess, Cart, Product } from '../../shared/types.js';

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

const getCart = (token?: string) => {
  const req = request(app).get('/api/cart');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const addItem = (body: Record<string, unknown>, token?: string) => {
  const req = request(app).post('/api/cart/items').send(body);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const updateItem = (productId: number | string, body: Record<string, unknown>, token?: string) => {
  const req = request(app).patch(`/api/cart/items/${productId}`).send(body);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const removeItem = (productId: number | string, token?: string) => {
  const req = request(app).delete(`/api/cart/items/${productId}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('Operaciones del carrito (sección 5 y sección 7)', () => {
  it('GET /api/cart de un usuario nuevo devuelve carrito vacío', async () => {
    const response = await getCart(tokenUser1);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: expect.any(Number),
        items: [],
        itemCount: 0,
        total: 0,
      },
    });
  });

  it('agregar un producto lo deja en el carrito con subtotal, itemCount y total correctos', async () => {
    // Tomamos el primer producto del catálogo
    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenUser1}`);
    const product = prodRes.body.data[0] as Product;

    const response = await addItem({ productId: product.id, quantity: 2 }, tokenUser1);

    expect(response.status).toBe(200);
    const cart = (response.body as ApiSuccess<Cart>).data;
    expect(cart.itemCount).toBe(2);
    expect(cart.total).toBe(product.price * 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toEqual({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 2,
      stock: product.stock,
      subtotal: product.price * 2,
    });
  });

  it('si no se envía quantity en POST /api/cart/items, por defecto es 1', async () => {
    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenUser1}`);
    const product = prodRes.body.data[0] as Product;

    const response = await addItem({ productId: product.id }, tokenUser1);

    expect(response.status).toBe(200);
    const cart = (response.body as ApiSuccess<Cart>).data;
    expect(cart.itemCount).toBe(1);
    expect(cart.items[0]!.quantity).toBe(1);
  });

  it('agregar el mismo producto dos veces suma las cantidades', async () => {
    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenUser1}`);
    const product = prodRes.body.data[0] as Product;

    await addItem({ productId: product.id, quantity: 2 }, tokenUser1);
    const response = await addItem({ productId: product.id, quantity: 3 }, tokenUser1);

    expect(response.status).toBe(200);
    const cart = (response.body as ApiSuccess<Cart>).data;
    expect(cart.items).toHaveLength(1);
    expect(cart.itemCount).toBe(5);
    expect(cart.total).toBe(product.price * 5);
    expect(cart.items[0]!.quantity).toBe(5);
    expect(cart.items[0]!.subtotal).toBe(product.price * 5);
  });

  it('agregar más unidades que el stock responde 409 OUT_OF_STOCK', async () => {
    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenUser1}`);
    const product = prodRes.body.data[0] as Product;

    const response = await addItem({ productId: product.id, quantity: product.stock + 1 }, tokenUser1);

    expect(response.status).toBe(409);
    const errorBody = response.body as ApiErrorBody;
    expect(errorBody.error.code).toBe('OUT_OF_STOCK');
    expect(errorBody.error.details).toEqual([
      expect.objectContaining({ productId: product.id }),
    ]);
  });

  it('agregar producto con stock 0 responde 409 OUT_OF_STOCK', async () => {
    // Modificamos el stock de un producto a 0
    db.prepare('UPDATE products SET stock = 0 WHERE id = 1').run();

    const response = await addItem({ productId: 1, quantity: 1 }, tokenUser1);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('agregar producto inexistente responde 404 PRODUCT_NOT_FOUND', async () => {
    const response = await addItem({ productId: 99999, quantity: 1 }, tokenUser1);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('validación de cuerpo y params responde 422 VALIDATION_ERROR con details', async () => {
    // quantity = 0
    const res0 = await addItem({ productId: 1, quantity: 0 }, tokenUser1);
    expect(res0.status).toBe(422);
    expect(res0.body.error.code).toBe('VALIDATION_ERROR');

    // quantity = 100
    const res100 = await addItem({ productId: 1, quantity: 100 }, tokenUser1);
    expect(res100.status).toBe(422);

    // quantity = 1.5
    const resFloat = await addItem({ productId: 1, quantity: 1.5 }, tokenUser1);
    expect(resFloat.status).toBe(422);

    // productId inválido
    const resInvalidId = await addItem({ productId: -5, quantity: 1 }, tokenUser1);
    expect(resInvalidId.status).toBe(422);

    // Campo desconocido (anti-abuso: ej. points)
    const resExtra = await addItem({ productId: 1, points: 50 }, tokenUser1);
    expect(resExtra.status).toBe(422);
  });

  it('PATCH /api/cart/items/:productId fija la cantidad (no suma)', async () => {
    await addItem({ productId: 1, quantity: 2 }, tokenUser1);

    const response = await updateItem(1, { quantity: 4 }, tokenUser1);

    expect(response.status).toBe(200);
    const cart = (response.body as ApiSuccess<Cart>).data;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(4);
    expect(cart.itemCount).toBe(4);
  });

  it('PATCH de un producto ausente en el carrito responde 404 CART_ITEM_NOT_FOUND', async () => {
    const response = await updateItem(1, { quantity: 3 }, tokenUser1);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CART_ITEM_NOT_FOUND');
  });

  it('PATCH sobre el stock disponible responde 409 OUT_OF_STOCK', async () => {
    await addItem({ productId: 1, quantity: 1 }, tokenUser1);
    const prod = db.prepare('SELECT stock FROM products WHERE id = 1').get() as { stock: number };

    const response = await updateItem(1, { quantity: prod.stock + 10 }, tokenUser1);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('DELETE /api/cart/items/:productId quita el producto y repetirlo responde 200 sin error', async () => {
    await addItem({ productId: 1, quantity: 2 }, tokenUser1);
    await addItem({ productId: 2, quantity: 1 }, tokenUser1);

    const res1 = await removeItem(1, tokenUser1);
    expect(res1.status).toBe(200);
    expect(res1.body.data.items).toHaveLength(1);
    expect(res1.body.data.items[0].productId).toBe(2);

    // Repetir el DELETE es idempotente
    const res2 = await removeItem(1, tokenUser1);
    expect(res2.status).toBe(200);
    expect(res2.body.data.items).toHaveLength(1);
  });

  it('dos usuarios distintos tienen carritos independientes', async () => {
    await addItem({ productId: 1, quantity: 2 }, tokenUser1);
    await addItem({ productId: 2, quantity: 1 }, tokenUser2);

    const cart1 = (await getCart(tokenUser1)).body.data as Cart;
    const cart2 = (await getCart(tokenUser2)).body.data as Cart;

    expect(cart1.id).not.toBe(cart2.id);
    expect(cart1.items).toHaveLength(1);
    expect(cart1.items[0]!.productId).toBe(1);

    expect(cart2.items).toHaveLength(1);
    expect(cart2.items[0]!.productId).toBe(2);
  });

  it('ninguna operación del carrito cambia el saldo de puntos', async () => {
    const meBefore = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenUser1}`);
    const balanceBefore = meBefore.body.data.pointsBalance;

    await addItem({ productId: 1, quantity: 2 }, tokenUser1);
    await updateItem(1, { quantity: 1 }, tokenUser1);
    await removeItem(1, tokenUser1);

    const meAfter = await request(app).get('/api/me').set('Authorization', `Bearer ${tokenUser1}`);
    expect(meAfter.body.data.pointsBalance).toBe(balanceBefore);
  });

  it('sin token responde 401 UNAUTHORIZED en todas las rutas del carrito', async () => {
    const resGet = await getCart();
    expect(resGet.status).toBe(401);
    expect(resGet.body.error.code).toBe('UNAUTHORIZED');

    const resPost = await addItem({ productId: 1, quantity: 1 });
    expect(resPost.status).toBe(401);

    const resPatch = await updateItem(1, { quantity: 2 });
    expect(resPatch.status).toBe(401);

    const resDelete = await removeItem(1);
    expect(resDelete.status).toBe(401);
  });
});
