import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiGetList, apiSend } from './api-client';
import { clearToken, getToken, setToken } from './token-store';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('devuelve el contenido de data, no el sobre completo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1, name: 'Licuadora' } }));

    await expect(apiGet<{ id: number; name: string }>('/products/1')).resolves.toEqual({
      id: 1,
      name: 'Licuadora',
    });
  });

  it('pega a rutas relativas con el prefijo /api', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await apiGet('/products');

    expect(fetchMock).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'GET' }));
  });

  it('añade el token guardado como Bearer', async () => {
    setToken('abc123');
    fetchMock.mockResolvedValue(jsonResponse({ data: null }));

    await apiGet('/me');

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer abc123' },
    });
  });

  it('omite Authorization si no hay token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }));

    await apiGet('/auth/login', { token: null });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: {} });
  });

  it('serializa la query y descarta valores vacíos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await apiGet('/products', { query: { page: 2, q: 'audio', category: undefined, pageSize: '' } });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('q=audio');
    expect(url).not.toContain('category=');
    expect(url).not.toContain('pageSize=');
  });

  it('lanza ApiError con code, message y details', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'OUT_OF_STOCK',
            message: 'Sin stock suficiente',
            details: [{ productId: 7, message: 'Solo quedan 2 unidades' }],
          },
        },
        409,
      ),
    );

    const error = await apiGet('/cart/items').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'OUT_OF_STOCK', message: 'Sin stock suficiente' });
    expect((error as ApiError).details).toEqual([
      { productId: 7, message: 'Solo quedan 2 unidades' },
    ]);
  });

  it('traduce una respuesta fuera del contrato a ApiError mostrable', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
  });

  it('traduce un fallo de red a ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('INTERNAL_ERROR');
  });

  it('reenvía el AbortError sin envolverlo', async () => {
    fetchMock.mockRejectedValue(new DOMException('abortado', 'AbortError'));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DOMException);
  });
});

describe('apiSend', () => {
  it('envía el cuerpo como JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1 } }));

    await apiSend('POST', '/cart/items', { body: { productId: 1, quantity: 2 } });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 1, quantity: 2 }),
    });
  });

  it('no manda Content-Type cuando no hay cuerpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1, items: [], itemCount: 0, total: 0 } }));

    await apiSend('POST', '/cart/checkout');

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: {}, body: undefined });
  });
});

describe('apiGetList', () => {
  it('devuelve data y meta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: 1 }], meta: { page: 2, pageSize: 12, total: 30, totalPages: 3 } }),
    );

    await expect(apiGetList<{ id: number }>('/products')).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { page: 2, pageSize: 12, total: 30, totalPages: 3 },
    });
  });
});

describe('token-store', () => {
  it('guarda, lee y borra el token', () => {
    expect(getToken()).toBeNull();

    setToken('abc123');
    expect(getToken()).toBe('abc123');

    clearToken();
    expect(getToken()).toBeNull();
  });
});
