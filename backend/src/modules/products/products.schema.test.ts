import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { parseQuery } from '../../shared/validate.js';
import { productsQuery } from './products.schema.js';

/** `req` no se usa: el helper solo lee `query`. */
const req = (query: unknown) => ({ query }) as unknown as Request;

const issuesOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ZodError) return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  }
  throw new Error('se esperaba un ZodError');
};

describe('productsQuery (§4)', () => {
  it('acepta categoría y búsqueda', () => {
    expect(
      parseQuery(productsQuery, req({ category: 'tecnologia', q: '  audífonos  ' })),
    ).toEqual({ page: 1, pageSize: 12, category: 'tecnologia', q: 'audífonos' });
  });

  it('ignora una búsqueda que solo tiene espacios', () => {
    // Sin esto, `q=` vacío se convertiría en el patrón `%`, que es un comodín y
    // devolvería el catálogo entero en vez de no filtrar.
    expect(parseQuery(productsQuery, req({ q: '   ' })).q).toBeUndefined();
  });

  it('rechaza una búsqueda de más de 100 caracteres', () => {
    expect(issuesOf(() => parseQuery(productsQuery, req({ q: 'x'.repeat(101) })))).toEqual([
      'q: Máximo 100 caracteres',
    ]);
  });

  it('acepta exactamente 100 caracteres', () => {
    expect(parseQuery(productsQuery, req({ q: 'x'.repeat(100) })).q).toHaveLength(100);
  });

  it('ignora parámetros desconocidos', () => {
    expect(parseQuery(productsQuery, req({ desconocido: '1' }))).toEqual({
      page: 1,
      pageSize: 12,
    });
  });

  it('acepta slugs con guiones y números', () => {
    expect(
      parseQuery(productsQuery, req({ category: 'electro-domesticos-2' })).category,
    ).toBe('electro-domesticos-2');
  });

  it('rechaza una categoría que no parece un slug', () => {
    // Sin el patrón, un `category=Hogar` devolvería 200 con lista vacía y el
    // usuario no sabría si se equivocó o si no hay productos.
    expect(issuesOf(() => parseQuery(productsQuery, req({ category: 'Hogar' })))).toEqual([
      'category: Categoría inválida',
    ]);
    expect(issuesOf(() => parseQuery(productsQuery, req({ category: 'hogar!' })))).toHaveLength(1);
    expect(issuesOf(() => parseQuery(productsQuery, req({ category: 'hogar/x' })))).toHaveLength(1);
  });

  it('rechaza un slug de más de 50 caracteres', () => {
    expect(issuesOf(() => parseQuery(productsQuery, req({ category: 'a'.repeat(51) })))).toEqual([
      'category: Máximo 50 caracteres',
    ]);
  });

  it('trata una categoría vacía como ausencia de filtro', () => {
    // La spec solo dice esto para `q`, pero `category=` vacío significaba
    // `c.slug = ''`, que no casa con nada: lista vacía sin explicación.
    expect(parseQuery(productsQuery, req({ category: '' })).category).toBeUndefined();
  });

  it('rechaza page=0, pageSize=51 y valores no numéricos', () => {
    expect(issuesOf(() => parseQuery(productsQuery, req({ page: '0' })))).toEqual([
      'page: Debe ser 1 o más',
    ]);
    expect(issuesOf(() => parseQuery(productsQuery, req({ pageSize: '51' })))).toEqual([
      'pageSize: Debe ser 50 o menos',
    ]);
    expect(issuesOf(() => parseQuery(productsQuery, req({ page: '2abc' })))).toHaveLength(1);
    expect(issuesOf(() => parseQuery(productsQuery, req({ pageSize: '1.5' })))).toHaveLength(1);
  });

  it('rechaza un parámetro repetido', () => {
    // Express convierte `?page=1&page=2` en un array. Sin el chequeo, Zod lo
    // coercionaría a NaN o tomaría el primero y el cliente creería haber paginado.
    expect(issuesOf(() => parseQuery(productsQuery, req({ page: ['1', '2'] })))).toHaveLength(1);
  });
});
