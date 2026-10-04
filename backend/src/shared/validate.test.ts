import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';
import { addCartItemBody, paginationQuery, productIdParam, updateCartItemBody } from './schemas.js';
import { parseBody, parseParams, parseQuery, validationDetails } from './validate.js';

/** `req` no se usa: los helpers solo leen `body`, `query` y `params`. */
const req = (values: { body?: unknown; query?: unknown; params?: unknown }) =>
  values as unknown as Request;

const issuesOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ZodError) return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  }
  throw new Error('se esperaba un ZodError');
};

describe('paginación (sección 4.2)', () => {
  it('aplica los valores por defecto', () => {
    expect(parseQuery(paginationQuery, req({ query: {} }))).toEqual({ page: 1, pageSize: 12 });
  });

  it('convierte los strings de la query en enteros', () => {
    expect(parseQuery(paginationQuery, req({ query: { page: '3', pageSize: '24' } }))).toEqual({
      page: 3,
      pageSize: 24,
    });
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ page: '-1' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ page: 'abc' }, 'page'],
    [{ pageSize: '0' }, 'pageSize'],
    [{ pageSize: '51' }, 'pageSize'],
    [{ pageSize: '999' }, 'pageSize'],
  ])('rechaza %o (sección 7: 422 con details por campo)', (query, field) => {
    expect(issuesOf(() => parseQuery(paginationQuery, req({ query })))).toContainEqual(
      expect.stringContaining(field),
    );
  });

  it('acepta los límites', () => {
    expect(parseQuery(paginationQuery, req({ query: { page: '1', pageSize: '1' } }))).toEqual({
      page: 1,
      pageSize: 1,
    });
    expect(parseQuery(paginationQuery, req({ query: { pageSize: '50' } }))).toEqual({
      page: 1,
      pageSize: 50,
    });
  });
});

describe('params de producto (sección 4.4)', () => {
  it('convierte el id de la ruta', () => {
    expect(parseParams(productIdParam, req({ params: { productId: '12' } }))).toEqual({ productId: 12 });
  });

  it.each([['0'], ['-3'], ['abc'], ['1.5']])('rechaza el id %s', (productId) => {
    expect(issuesOf(() => parseParams(productIdParam, req({ params: { productId } })))).toHaveLength(1);
  });
});

describe('cuerpo del carrito (sección 4.3)', () => {
  it('la cantidad es opcional y por defecto 1', () => {
    expect(parseBody(addCartItemBody, req({ body: { productId: '5' } }))).toEqual({
      productId: 5,
      quantity: 1,
    });
  });

  it('rechaza puntos en el cuerpo (sección 7)', () => {
    expect(issuesOf(() => parseBody(addCartItemBody, req({ body: { productId: 5, points: 500 } })))).toEqual([
      ': Llave desconocida: "points"',
    ]);
  });

  it.each([[0], [100], [1.5], ['abc']])('rechaza la cantidad %o', (value) => {
    expect(issuesOf(() => parseBody(addCartItemBody, req({ body: { productId: 5, quantity: value } })))).toHaveLength(1);
  });

  it('PATCH exige la cantidad', () => {
    expect(issuesOf(() => parseBody(updateCartItemBody, req({ body: {} })))).toHaveLength(1);
  });

  it('PATCH no acepta productId: el id va en la URL', () => {
    expect(
      issuesOf(() => parseBody(updateCartItemBody, req({ body: { quantity: 2, productId: 5 } }))),
    ).toHaveLength(1);
  });
});

describe('validationDetails (sección 2)', () => {
  it('traduce los mensajes de Zod al español', () => {
    const details = validationDetails(
      paginationQuery.safeParse({ page: '0' }).error as ZodError,
    );

    expect(details).toEqual([{ field: 'page', message: 'Debe ser 1 o más' }]);
  });

  it('omite field en issues de raíz', () => {
    const details = validationDetails(
      addCartItemBody.safeParse({ productId: 5, points: 1 }).error as ZodError,
    );

    expect(details).toEqual([{ message: 'Llave desconocida: "points"' }]);
  });

  it('une campos anidados con punto', () => {
    const details = validationDetails(z.object({ a: z.object({ b: z.string() }) }).safeParse({ a: { b: 1 } }).error as ZodError);

    expect(details[0]?.field).toBe('a.b');
  });
});
