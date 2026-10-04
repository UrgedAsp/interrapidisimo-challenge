import type {
  ApiErrorBody,
  ApiList,
  ApiSuccess,
  ErrorCode,
  ErrorDetail,
  PageMeta,
} from '../types/api.js';
import { getToken } from '../lib/token-store.js';

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

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let onUnauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorizedHandler = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
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

  return new ApiError(
    status,
    status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
    'No pudimos comunicarnos con el servidor. Intenta de nuevo.',
  );
}

export async function requestEnvelope<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
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
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'No hay conexión con el servidor.');
  }

  const payload = await readBody(response);

  if (!response.ok) {
    const apiError = toApiError(response.status, payload);

    // Ante 401 UNAUTHORIZED (no INVALID_CREDENTIALS ni login)
    if (response.status === 401 && apiError.code === 'UNAUTHORIZED' && path !== '/auth/login') {
      onUnauthorizedHandler?.();
    }

    throw apiError;
  }

  if (payload === undefined || typeof payload !== 'object') {
    throw new ApiError(response.status, 'UNKNOWN_ERROR', 'Respuesta inesperada del servidor.');
  }

  return payload as T;
}

/** Desenvuelve `{ data }` y devuelve solo el contenido. */
export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const payload = await requestEnvelope<ApiSuccess<T>>(path, options);
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new ApiError(200, 'UNKNOWN_ERROR', 'Respuesta con formato inválido.');
  }
  return payload.data;
}

export async function requestList<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiList<T>> {
  const body = await requestEnvelope<Partial<ApiList<T>>>(path, options);
  const data = body?.data ?? [];
  const meta = body?.meta ?? buildFallbackMeta(data.length);

  return { data, meta };
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

export function apiGetList<T>(
  path: string,
  options: Omit<ApiRequestOptions, 'method' | 'body'> = {},
): Promise<ApiList<T>> {
  return requestList<T>(path, { ...options, method: 'GET' });
}

function buildFallbackMeta(count: number): PageMeta {
  return { page: 1, pageSize: count, total: count, totalPages: count > 0 ? 1 : 0 };
}
