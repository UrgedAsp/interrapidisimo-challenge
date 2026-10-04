import type { ErrorCode } from '../types/api.js';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: 'No hay conexión con el servidor. Revisa tu conexión a internet.',
  UNAUTHORIZED: 'Tu sesión ha expirado o no es válida. Inicia sesión de nuevo.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  OUT_OF_STOCK: 'No hay suficiente stock disponible para completar la solicitud.',
  CART_EMPTY: 'El carrito está vacío.',
  PRODUCT_NOT_FOUND: 'El producto solicitado no fue encontrado.',
  CART_ITEM_NOT_FOUND: 'El producto no está en el carrito.',
  VALIDATION_ERROR: 'Los datos enviados son inválidos. Revisa el formulario.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado en el servidor. Intenta de nuevo más tarde.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado. Intenta de nuevo.',
  BAD_REQUEST: 'La solicitud no pudo ser procesada.',
  ROUTE_NOT_FOUND: 'La ruta solicitada no existe.',
};

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: ErrorCode }).code;
    if (code && code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[code];
    }

    const message = (error as { message?: string }).message;
    if (message && typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
