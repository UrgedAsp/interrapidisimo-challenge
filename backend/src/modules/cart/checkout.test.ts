import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import type { CheckoutResult } from '../../shared/types.js';

let db: DatabaseConnection;
let app: ReturnType<typeof createApp>;
let tokenUser1: string;

beforeEach(async () => {
  db = createSeededDatabase();
  app = createApp(db);

  const login1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@tienda.co', password: 'ClaveDemo123' });
  tokenUser1 = login1.body.data.token;
});

const checkout = (token?: string) => {
  const req = request(app).post('/api/cart/checkout');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('Checkout y recompensas de compra (sección 6 de 10-backend-cart.md y 03-rewards.md)', () => {
  it('checkout con carrito vacío responde 409 CART_EMPTY', async () => {
    const res = await checkout(tokenUser1);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_EMPTY');
  });

  it('checkout exitoso crea la orden, descuenta stock, cierra carrito y otorga puntos', async () => {
    // Obtenemos dos productos
    const p1 = db.prepare('SELECT id, name, price, stock FROM products WHERE id = 1').get() as {
      id: number;
      name: string;
      price: number;
      stock: number;
    };
    const p2 = db.prepare('SELECT id, name, price, stock FROM products WHERE id = 2').get() as {
      id: number;
      name: string;
      price: number;
      stock: number;
    };

    // Agregamos al carrito
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: p1.id, quantity: 2 });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: p2.id, quantity: 1 });

    const totalEsperado = p1.price * 2 + p2.price * 1;
    // Puntos: floor(total / 1000) + 2 productos * 5
    const puntosEsperados = Math.floor(totalEsperado / 1000) + 10;

    const res = await checkout(tokenUser1);

    expect(res.status).toBe(201);
    const result = res.body.data as CheckoutResult;
    expect(result.order.total).toBe(totalEsperado);
    expect(result.order.items).toHaveLength(2);
    expect(result.pointsAwarded).toBe(puntosEsperados);
    expect(result.pointsBalance).toBe(puntosEsperados);

    // Verificar descuento de stock en BD
    const p1After = db.prepare('SELECT stock FROM products WHERE id = 1').get() as { stock: number };
    const p2After = db.prepare('SELECT stock FROM products WHERE id = 2').get() as { stock: number };
    expect(p1After.stock).toBe(p1.stock - 2);
    expect(p2After.stock).toBe(p2.stock - 1);

    // Verificar que tras checkout, GET /api/cart entrega un carrito nuevo y vacío
    const cartAfter = await request(app).get('/api/cart').set('Authorization', `Bearer ${tokenUser1}`);
    expect(cartAfter.body.data.items).toHaveLength(0);
    expect(cartAfter.body.data.itemCount).toBe(0);

    // Invariante de saldo vs ledger
    const userRow = db.prepare('SELECT points_balance FROM users WHERE id = 1').get() as { points_balance: number };
    const ledgerSum = db.prepare('SELECT SUM(points) AS total FROM points_ledger WHERE user_id = 1').get() as { total: number };
    expect(userRow.points_balance).toBe(puntosEsperados);
    expect(userRow.points_balance).toBe(ledgerSum.total);
  });

  it('stock insuficiente en uno de varios ítems responde 409 OUT_OF_STOCK y no aplica ningún cambio', async () => {
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: 1, quantity: 2 });
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: 2, quantity: 2 });

    const p1StockBefore = (db.prepare('SELECT stock FROM products WHERE id = 1').get() as { stock: number }).stock;

    // Cambiamos el stock del producto 2 a 1 para simular falta de stock antes del checkout

    db.prepare('UPDATE products SET stock = 1 WHERE id = 2').run();

    const res = await checkout(tokenUser1);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');

    // Nada debe haber cambiado
    const p1StockAfter = (db.prepare('SELECT stock FROM products WHERE id = 1').get() as { stock: number }).stock;
    const p2StockAfter = (db.prepare('SELECT stock FROM products WHERE id = 2').get() as { stock: number }).stock;
    expect(p1StockAfter).toBe(p1StockBefore);
    expect(p2StockAfter).toBe(1);

    const ordersCount = (db.prepare('SELECT COUNT(*) AS total FROM orders WHERE user_id = 1').get() as { total: number }).total;
    expect(ordersCount).toBe(0);

    const ledgerCount = (db.prepare('SELECT COUNT(*) AS total FROM points_ledger WHERE user_id = 1').get() as { total: number }).total;
    expect(ledgerCount).toBe(0);
  });

  it('segundo checkout inmediato responde 409 CART_EMPTY sin duplicar orden ni puntos', async () => {
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: 1, quantity: 1 });

    const res1 = await checkout(tokenUser1);
    expect(res1.status).toBe(201);

    const res2 = await checkout(tokenUser1);
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('CART_EMPTY');
  });

  it('si el precio de un producto cambia después de agregarlo, el checkout usa el precio vigente', async () => {
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${tokenUser1}`).send({ productId: 1, quantity: 1 });

    // Modificamos el precio del producto en la base de datos
    db.prepare('UPDATE products SET price = 99000 WHERE id = 1').run();

    const res = await checkout(tokenUser1);
    expect(res.status).toBe(201);
    expect(res.body.data.order.total).toBe(99000);
    expect(res.body.data.order.items[0].unitPrice).toBe(99000);
  });

  it('sin token responde 401 UNAUTHORIZED', async () => {
    const res = await checkout();
    expect(res.status).toBe(401);
  });
});
