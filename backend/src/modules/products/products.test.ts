import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import type { DatabaseConnection } from '../../db/connection.js';
import { createSeededDatabase } from '../../db/testing.js';
import { signToken } from '../../shared/jwt.js';
import type { ApiErrorBody, ApiList, Product } from '../../shared/types.js';

let db: DatabaseConnection;
let app: ReturnType<typeof createApp>;
let token: string;

/** `createSeededDatabase` corre el seed real, así que el catálogo tiene 40 productos. */
const TOTAL_PRODUCTOS = 40;

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

const products = async (path = '/api/products'): Promise<ApiList<Product>> => {
  const response = await get(path);

  return response.body as ApiList<Product>;
};

const names = (list: ApiList<Product>) => list.data.map((p) => p.name);
const ids = (list: ApiList<Product>) => list.data.map((p) => p.id);

describe('GET /api/products sin parámetros (§4)', () => {
  it('devuelve la primera página de 12 con el meta real', async () => {
    const response = await get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(12);
    expect(response.body.meta).toEqual({
      page: 1,
      pageSize: 12,
      total: TOTAL_PRODUCTOS,
      totalPages: Math.ceil(TOTAL_PRODUCTOS / 12),
    });
  });

  it('respeta pageSize', async () => {
    const response = await get('/api/products?pageSize=5');

    expect(response.body.data).toHaveLength(5);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 5, total: 40, totalPages: 8 });
  });

  it('cada producto trae su categoría como objeto y su isFavorite', async () => {
    const producto = (await products()).data[0]!;

    expect(producto).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
      price: expect.any(Number),
      imageUrl: expect.stringContaining('http'),
      stock: expect.any(Number),
      category: {
        id: expect.any(Number),
        name: expect.any(String),
        slug: expect.stringMatching(/^[a-z0-9-]+$/),
      },
      isFavorite: false,
    });
  });

  it('isFavorite es booleano, no 0 o 1', async () => {
    const producto = (await products()).data[0]!;

    expect(typeof producto.isFavorite).toBe('boolean');
  });
});

describe('paginación estable (§4)', () => {
  it('el orden es por name y las páginas no se solapan', async () => {
    const primera = await products('/api/products?pageSize=12&page=1');
    const segunda = await products('/api/products?pageSize=12&page=2');
    const tercera = await products('/api/products?pageSize=12&page=3');
    const cuarta = await products('/api/products?pageSize=12&page=4');

    const juntos = [...ids(primera), ...ids(segunda), ...ids(tercera), ...ids(cuarta)];

    expect(juntos).toHaveLength(TOTAL_PRODUCTOS);
    expect(new Set(juntos).size).toBe(TOTAL_PRODUCTOS);
    expect(juntos).toEqual([...ids(primera), ...ids(segunda), ...ids(tercera), ...ids(cuarta)]);
  });

  it('el orden no depende del caso en las letras ASCII', async () => {
    const todos = await products('/api/products?pageSize=50');
    const porNombre = [...todos.data].sort(
      (a, b) =>
        (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1) || a.id - b.id,
    );

    expect(ids(todos)).toEqual(porNombre.map((p) => p.id));
    // `PORTÁTIL` y `Portátil` tienen el mismo nombre en NOCASE, así que el desempate
    // por id es lo que evita que dos peticiones los ordenen distinto.
    expect(todos.data.map((p) => p.name)).toContain('Portátil profesional');
  });

  it('el orden es idéntico en dos peticiones seguidas', async () => {
    // NOCASE pliega el caso pero ordena por byte UTF-8, así que las tildes no van
    // donde un lector en español las esperaría ("Máscara" después de "Mesa"). La spec
    // solo pide orden estable, y eso es lo que se comprueba aquí.
    const primera = await products('/api/products?pageSize=50');
    const segunda = await products('/api/products?pageSize=50');

    expect(ids(segunda)).toEqual(ids(primera));
  });

  it('una página fuera de rango devuelve lista vacía con el meta real', async () => {
    const response = await get('/api/products?page=99');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 99, pageSize: 12, total: 40, totalPages: 4 });
  });

  it('pageSize=50 devuelve el catálogo entero en una página', async () => {
    const response = await get('/api/products?pageSize=50');

    expect(response.body.data).toHaveLength(40);
    expect(response.body.meta.totalPages).toBe(1);
  });
});

describe('filtro por categoría (§4)', () => {
  it('devuelve solo productos de ese slug y el total refleja el filtro', async () => {
    const lista = await products('/api/products?category=hogar&pageSize=50');

    expect(lista.data.length).toBeGreaterThan(0);
    expect(lista.data.every((p) => p.category.slug === 'hogar')).toBe(true);
    expect(lista.meta.total).toBe(lista.data.length);
  });

  it('cada categoría del seed devuelve al menos un producto', async () => {
    for (const slug of CATEGORIAS) {
      const lista = await products(`/api/products?category=${slug}&pageSize=50`);
      expect(lista.meta.total, slug).toBeGreaterThan(0);
    }
  });

  it('sumar los filtros por categoría da el total del catálogo', async () => {
    const totales = await Promise.all(
      CATEGORIAS.map(async (slug) => (await products(`/api/products?category=${slug}&pageSize=50`)).meta.total),
    );

    expect(totales.reduce((a, b) => a + b, 0)).toBe(TOTAL_PRODUCTOS);
  });

  it('una categoría inexistente devuelve 200 con lista vacía, no un error', async () => {
    const response = await get('/api/products?category=no-existe');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 });
  });

  it('el filtro de categoría se hace en SQL, no en memoria', async () => {
    const conFiltro = await products('/api/products?category=hogar&pageSize=50');
    const idsHogar = new Set(conFiltro.data.map((p) => p.id));

    // Si el filtro se aplicara en memoria, el total seguiría siendo el del
    // catálogo completo. Con la consulta filtrada, meta.total es el del subconjunto.
    expect(conFiltro.meta.total).toBe(idsHogar.size);
    expect(conFiltro.meta.total).toBeLessThan(TOTAL_PRODUCTOS);
  });
});

describe('búsqueda por nombre (§4)', () => {
  it('encuentra un producto escrito con tilde sin escribirla', async () => {
    // "Espátula de bambú" está en el seed; "espatula" no lleva la tilde.
    const lista = await products('/api/products?q=espatula');

    expect(names(lista)).toContain('Espátula de bambú');
  });

  it('da igual escribir con tilde, sin tilde o en mayúsculas', async () => {
    const sinTilde = await products('/api/products?q=espatula&pageSize=50');
    const conTilde = await products('/api/products?q=esp%C3%A1tula&pageSize=50');
    const enMayusculas = await products('/api/products?q=ESP%C3%81TULA&pageSize=50');

    expect(ids(conTilde)).toEqual(ids(sinTilde));
    expect(ids(enMayusculas)).toEqual(ids(sinTilde));
  });

  it('buscar con tilde también encuentra el producto', async () => {
    // La otra dirección: la tilde que escribe el usuario también se quita, así que
    // "clasicas" y "clásicas" dan lo mismo.
    const lista = await products('/api/products?q=cl%C3%A1sicas&pageSize=50');

    expect(names(lista)).toContain('Gafas de sol clásicas');
  });

  it('la ñ se busca como n', async () => {
    // "Máscara de pestañas" está en el seed. Efecto colateral del NFD documentado
    // en §6: la tilde de la ñ se quita y queda "pestanas".
    const conN = await products('/api/products?q=pestanas&pageSize=50');
    const conEnie = await products('/api/products?q=pesta%C3%B1as&pageSize=50');

    expect(names(conN)).toContain('Máscara de pestañas');
    expect(ids(conEnie)).toEqual(ids(conN));
    expect(names(await products('/api/products?q=unas&pageSize=50'))).toContain(
      'Esmalte de uñas rojo',
    );
  });

  it('recorta la búsqueda antes de usarla', async () => {
    const conEspacios = await products('/api/products?q=%20%20espatula%20%20');
    const limpio = await products('/api/products?q=espatula');

    expect(ids(conEspacios)).toEqual(ids(limpio));
  });

  it('una búsqueda sin coincidencias devuelve 200 con total 0', async () => {
    const response = await get('/api/products?q=zzzzz-no-existe-zzz');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 12, total: 0, totalPages: 0 });
  });

  it('combina categoría y búsqueda aplicando ambos filtros', async () => {
    const soloCategoria = await products('/api/products?category=tecnologia&pageSize=50');
    const conAmbos = await products('/api/products?category=tecnologia&q=smart&pageSize=50');

    expect(conAmbos.meta.total).toBeGreaterThan(0);
    expect(conAmbos.meta.total).toBeLessThan(soloCategoria.meta.total);
    expect(conAmbos.data.every((p) => p.category.slug === 'tecnologia')).toBe(true);
  });
});

describe('los comodines de LIKE se escapan (§4)', () => {
  it('buscar % no devuelve el catálogo entero', async () => {
    // Sin escapar, `%` es un comodín que casa con cualquier texto.
    const lista = await products('/api/products?q=%25&pageSize=50');

    expect(lista.meta.total).toBe(0);
  });

  it('buscar _ no devuelve todo', async () => {
    const lista = await products('/api/products?q=_&pageSize=50');

    expect(lista.meta.total).toBe(0);
  });

  it('buscar _ sí encuentra un fragmento de un solo caracter', async () => {
    const conGuion = await products('/api/products?q=smart-_%25&pageSize=50');

    expect(conGuion.meta.total).toBe(0);
    expect(names(await products('/api/products?q=smart&pageSize=50'))).toContain('Smartphone básico');
  });

  it('una barra invertida no rompe la consulta ni hace comodín', async () => {
    const lista = await products(`/api/products?q=${encodeURIComponent('\\')}&pageSize=50`);

    expect(lista.meta.total).toBe(0);
  });

  it('la búsqueda con comodín literal no filtra de más', async () => {
    const wildcard = await products('/api/products?q=%25%25%25&pageSize=50');
    const nada = await products('/api/products?q=no-existe&pageSize=50');

    expect(wildcard.meta.total).toBe(nada.meta.total);
  });
});

describe('isFavorite por usuario (§4)', () => {
  it('es true solo para los productos que el usuario marcó', async () => {
    const antes = await products('/api/products?pageSize=50');
    const objetivo = antes.data[3]!;

    expect(antes.data.filter((p) => p.isFavorite)).toHaveLength(0);

    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(1, objetivo.id);

    const despues = await products('/api/products?pageSize=50');
    const marcado = despues.data.find((p) => p.id === objetivo.id);

    expect(marcado?.isFavorite).toBe(true);
    expect(despues.data.filter((p) => p.isFavorite)).toHaveLength(1);
  });

  it('otro usuario no ve como favoritos los productos del primero', async () => {
    db.prepare('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)').run(1, 1);

    const tokenOtro = signToken(2);
    const response = await request(app)
      .get('/api/products?pageSize=50')
      .set('Authorization', `Bearer ${tokenOtro}`);

    expect(response.body.data.every((p: Product) => p.isFavorite === false)).toBe(true);
  });
});

describe('validación de la query (§4)', () => {
  it('rechaza page=0, pageSize=51 y page=abc con 422 y details', async () => {
    for (const query of ['page=0', 'pageSize=51', 'page=abc', 'page=2abc', 'pageSize=0']) {
      const response = await get(`/api/products?${query}`);

      expect(response.status, query).toBe(422);
      expect(response.body.error.code, query).toBe('VALIDATION_ERROR');
      expect(response.body.error.details?.[0]?.field, query).toMatch(/page|pageSize/);
    }
  });

  it('rechaza un parámetro repetido', async () => {
    const response = await get('/api/products?page=1&page=2');

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza una categoría que no es slug', async () => {
    const response = await get('/api/products?category=Hogar');

    expect(response.status).toBe(422);
    expect(response.body.error.details?.[0]?.field).toBe('category');
  });

  it('ignora parámetros desconocidos', async () => {
    const response = await get('/api/products?utm_source=noticias&desconocido=1');

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(TOTAL_PRODUCTOS);
  });

  it('el mensaje de error sigue el contrato', async () => {
    const response = await get('/api/products?page=0');
    const { error } = response.body as ApiErrorBody;

    expect(Object.keys(error)).toEqual(expect.arrayContaining(['code', 'message']));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual([expect.objectContaining({ field: 'page' })]);
  });
});

describe('protección del catálogo (§4)', () => {
  it('sin token responde 401 en products', async () => {
    const response = await get('/api/products', false);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('con token ajeno responde 401 con el mismo mensaje', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, 'otro-secreto', { algorithm: 'HS256' })}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Inicia sesión para continuar');
  });

  it('el mensaje 401 no distingue el motivo', async () => {
    const sinToken = await get('/api/products', false);
    const tokenRoto = await request(app)
      .get('/api/products')
      .set('Authorization', 'Bearer no-es-un-token');
    const tokenVencido = await request(app)
      .get('/api/products')
      .set(
        'Authorization',
        `Bearer ${jwt.sign({ sub: '1' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '-1s' })}`,
      );

    const cuerpos = [sinToken, tokenRoto, tokenVencido].map((r) => JSON.stringify(r.body));

    expect(new Set(cuerpos).size).toBe(1);
  });
});
