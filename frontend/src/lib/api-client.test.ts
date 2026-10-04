import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiGet,
  apiGetList,
  apiSend,
  setUnauthorizedHandler,
} from '../api/apiClient.js';
import { getErrorMessage } from './errors.js';
import { formatCOP, formatPoints } from './format.js';
import { clearToken, getToken, removeToken, setToken } from './token-store.js';

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
  setUnauthorizedHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient (§5 y §13 de 20-frontend-base.md)', () => {
  it('apiGet devuelve el contenido de data, no el sobre completo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: 1, name: 'Licuadora' } }));

    await expect(apiGet<{ id: number; name: string }>('/products/1')).resolves.toEqual({
      id: 1,
      name: 'Licuadora',
    });
  });

  it('apiGetList devuelve data y meta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ id: 1 }], meta: { page: 2, pageSize: 12, total: 30, totalPages: 3 } }),
    );

    await expect(apiGetList<{ id: number }>('/products')).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { page: 2, pageSize: 12, total: 30, totalPages: 3 },
    });
  });

  it('lanza ApiError con code, message y details ante error del contrato', async () => {
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

  it('un fallo de red produce ApiError con code: NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('una respuesta no JSON o inválida produce UNKNOWN_ERROR', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502 Bad Gateway</html>', { status: 502 }));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('UNKNOWN_ERROR');
  });

  it('401 UNAUTHORIZED invoca el manejador de sesión', async () => {
    const unauthorizedSpy = vi.fn();
    setUnauthorizedHandler(unauthorizedSpy);

    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } }, 401),
    );

    await apiGet('/cart').catch(() => {});

    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });

  it('401 INVALID_CREDENTIALS en login NO invoca el manejador de sesión', async () => {
    const unauthorizedSpy = vi.fn();
    setUnauthorizedHandler(unauthorizedSpy);

    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'INVALID_CREDENTIALS', message: 'Clave errónea' } }, 401),
    );

    await apiSend('POST', '/auth/login', { body: { email: 'a@b.com', password: '123' } }).catch(
      () => {},
    );

    expect(unauthorizedSpy).not.toHaveBeenCalled();
  });

  it('una petición cancelada relanza AbortError sin convertirla en ApiError', async () => {
    fetchMock.mockRejectedValue(new DOMException('abortado', 'AbortError'));

    const error = await apiGet('/products').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DOMException);
  });
});

describe('Utilidades (§11 de 20-frontend-base.md)', () => {
  it('formatCOP formatea valores en pesos colombianos sin decimales', () => {
    const formatted = formatCOP(89900);
    expect(formatted).toMatch(/89\.900/);
    expect(formatted).toContain('$');
  });

  it('formatPoints formatea enteros con separador de miles', () => {
    const formatted = formatPoints(1250);
    expect(formatted).toMatch(/1\.250/);
  });

  it('getErrorMessage devuelve el mensaje en español correspondiente según el código', () => {
    expect(getErrorMessage(new ApiError(409, 'OUT_OF_STOCK', 'msg'))).toContain('stock');
    expect(getErrorMessage(new ApiError(409, 'CART_EMPTY', 'msg'))).toContain('carrito');
    expect(getErrorMessage(new ApiError(0, 'NETWORK_ERROR', 'msg'))).toContain('conexión');
    expect(getErrorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'msg'))).toContain('incorrectos');
    expect(getErrorMessage(new ApiError(404, 'PRODUCT_NOT_FOUND', 'msg'))).toContain('encontrado');
    expect(getErrorMessage(new Error('error genérico'))).toBe('error genérico');
    expect(getErrorMessage('algo')).toBe('Ocurrió un error inesperado. Intenta de nuevo.');
  });
});

describe('token-store', () => {
  it('guarda, lee y borra el token', () => {
    expect(getToken()).toBeNull();

    setToken('abc123');
    expect(getToken()).toBe('abc123');

    removeToken();
    expect(getToken()).toBeNull();

    setToken('def456');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
