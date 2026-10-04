import type {
  ApiErrorBody,
  ApiList,
  ApiSuccess,
  ErrorCode,
  ErrorDetail,
  PageMeta,
} from '@/types/api';
import { getToken } from './token-store';

/**
 * Único cliente HTTP del frontend (§6). Devuelve el contenido de `data` en
 * éxito y lanza `ApiError` con `code`, `message` y `details` en error, de modo
 * que las pantallas solo tengan que mirar un tipo.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | undefined | null;

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Por defecto toma el token guardado; `null` lo omite (login). */
  token?: string | null;
  signal?: AbortSignal;
};

const BASE_URL = '/api';

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    // Los filtros vacíos no viajan: `q=""` y omitirlo significan lo mismo.
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const suffix = search.toString();
  return `${BASE_URL}${path}${suffix ? `?${suffix}` : ''}`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as Partial<ApiErrorBody> | undefined)?.error;

  if (error?.code) {
    return new ApiError(status, error.code, error.message, error.details);
  }

  // Respuesta fuera del contrato: por ejemplo el proxy de Vite devolviendo
  // HTML, o un 502 de un servidor intermedio. Se traduce a algo mostrable en
  // vez de dejar que la pantalla reviente al leer `.error`.
  return new ApiError(
    status,
    status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
    'No pudimos comunicarnos con el servidor. Intenta de nuevo.',
  );
}

async function requestEnvelope<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { method = 'GET', body, query, token = getToken(), signal } = options;

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'INTERNAL_ERROR', 'No hay conexión con el servidor.');
  }

  const payload = await readBody(response);

  if (!response.ok) throw toApiError(response.status, payload);

  return payload as T;
}

/** Desenvuelve `{ data }` y devuelve solo el contenido. */
async function request<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const payload = await requestEnvelope<ApiSuccess<T>>(path, options);
  return payload.data;
}

export function apiGet<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return request<T>(path, { ...options, method: 'GET' });
}

export function apiSend<T>(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: Omit<ApiRequestOptions, 'method'> = {},
) {
  return request<T>(path, { ...options, method });
}

/** Para listados paginados, que además traen `meta`. */
export async function apiGetList<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<ApiList<T>> {
  // Va al sobre completo, no a `request`: aquí el sobre ES el `ApiList`.
  const body = await requestEnvelope<Partial<ApiList<T>>>(path, { ...options, method: 'GET' });
  const data = body.data ?? [];

  return { data, meta: body.meta ?? buildFallbackMeta(data.length) };
}

/** `meta` solo falta si el backend se saltó `okList`; se degrada en vez de romper. */
function buildFallbackMeta(count: number): PageMeta {
  return { page: 1, pageSize: count, total: count, totalPages: count > 0 ? 1 : 0 };
}
