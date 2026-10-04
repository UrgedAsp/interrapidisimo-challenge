import type { ErrorCode, ErrorDetail } from './types.js';

/**
 * Error de negocio. Lo lanzan los services y el middleware de errores lo
 * traduce a la forma `{ error: { code, message, details } }` de §2.
 *
 * Los services nunca lanzan `Error` a secas: un error suelto se convertiría en
 * un 500 genérico y perdería el código que el cliente necesita.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, 'BAD_REQUEST', message, details);

/**
 * Mensaje único de 401. §5 de `10-backend-auth.md` pide no distinguir por qué
 * falló la autenticación: un mensaje que dijera "tu sesión expiró" revelaría
 * cuándo se emitió el token que tiene el atacante.
 */
export const UNAUTHORIZED_MESSAGE = 'Inicia sesión para continuar';

export const unauthorized = (message: string = UNAUTHORIZED_MESSAGE) =>
  new AppError(401, 'UNAUTHORIZED', message);

/**
 * Login fallido. Un solo mensaje para los dos casos —correo inexistente o
 * contraseña incorrecta— porque distinguirlos confirmaría qué correos están
 * registrados en la tienda.
 */
export const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');

export const productNotFound = (productId: number) =>
  new AppError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe', [
    { productId, message: 'No hay ningún producto con ese id' },
  ]);

export const cartItemNotFound = (productId: number) =>
  new AppError(404, 'CART_ITEM_NOT_FOUND', 'El producto no está en el carrito', [
    { productId, message: 'El carrito no tiene ese producto' },
  ]);
