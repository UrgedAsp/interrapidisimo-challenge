const TOKEN_KEY = 'interrapidisimo.token';

/**
 * El token vive en `localStorage` (`00-overview.md` §7). El riesgo de XSS está
 * documentado y aceptado: no hay cookie httpOnly porque el API usa
 * `Authorization: Bearer` y no necesita credenciales de CORS.
 */
export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
