const TOKEN_KEY = 'interrapidisimo.token';

/**
 * El token vive en `localStorage` (`00-overview.md` sección 7). El riesgo de XSS está
 * documentado y aceptado: no hay cookie httpOnly porque el API usa
 * `Authorization: Bearer` y no necesita credenciales de CORS.
 *
 * Todas las operaciones llevan try/catch por si localStorage está bloqueado.
 */
export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignorar si el almacenamiento privado está deshabilitado
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignorar
  }
}

export const removeToken = clearToken;
