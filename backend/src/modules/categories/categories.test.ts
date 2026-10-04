import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import type { ApiSuccess, Category } from '../../shared/types.js';

let db: DatabaseConnection;
let app: ReturnType<typeof createApp>;
let token: string;

const CATEGORIAS = ['accesorios', 'belleza', 'hogar', 'moda', 'tecnologia'];

beforeEach(async () => {
  db = createSeededDatabase();
  app = createApp(db);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@tienda.co', password: 'ClaveDemo123' });
  token = login.body.data.token;
});

const get = (path: string, withToken = true) => {
  const call = request(app).get(path);
  return withToken ? call.set('Authorization', `Bearer ${token}`) : call;
};

describe('GET /api/categories (§5)', () => {
  it('devuelve todas las categorías ordenadas por nombre', async () => {
    const response = await get('/api/categories');

    expect(response.status).toBe(200);
    const { data } = response.body as ApiSuccess<Category[]>;

    expect(data).toHaveLength(CATEGORIAS.length);
    expect(data.map((c) => c.slug).sort()).toEqual([...CATEGORIAS].sort());
    expect(data.map((c) => c.name)).toEqual(
      [...data.map((c) => c.name)].sort((a, b) => a.localeCompare(b, 'es')),
    );
  });

  it('cada categoría trae id, name y slug y nada más', async () => {
    const { data } = (await get('/api/categories')).body as ApiSuccess<Category[]>;

    for (const categoria of data) {
      expect(Object.keys(categoria).sort()).toEqual(['id', 'name', 'slug']);
    }
  });

  it('los slugs que devuelve son los que acepta el filtro de products', async () => {
    const { data } = (await get('/api/categories')).body as ApiSuccess<Category[]>;

    for (const { slug } of data) {
      const respuesta = await get(`/api/products?category=${slug}&pageSize=50`);

      expect(respuesta.body.meta.total, slug).toBeGreaterThan(0);
    }
  });

  it('sin token responde 401', async () => {
    const response = await get('/api/categories', false);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
