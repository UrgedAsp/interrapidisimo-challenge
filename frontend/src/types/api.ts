/**
 * Contrato del API. Espejo de `backend/src/shared/types.ts` (sección 3).
 *
 * Duplicado a propósito: no hay paquete de tipos compartido entre backend y
 * frontend (recorte documentado en `00-overview.md` sección 2). Si cambias un tipo
 * aquí, cámbialo también en el backend.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'PRODUCT_NOT_FOUND'
  | 'CART_ITEM_NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'CART_EMPTY'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';


export type ApiSuccess<T> = { data: T };

export type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };

export type ApiList<T> = { data: T[]; meta: PageMeta };

export type ErrorDetail = { field?: string; message: string; productId?: number };

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
};

export type Category = { id: number; name: string; slug: string };

export type Product = {
  id: number;
  name: string;
  /** COP, entero. */
  price: number;
  imageUrl: string;
  stock: number;
  category: Category;
  /** Del usuario autenticado. */
  isFavorite: boolean;
};

export type CartItem = {
  productId: number;
  name: string;
  /** COP, entero. */
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
  /** price * quantity. */
  subtotal: number;
};

export type Cart = {
  id: number;
  items: CartItem[];
  itemCount: number;
  total: number;
};

export type User = { id: number; name: string; email: string; pointsBalance: number };

export type Order = {
  id: number;
  total: number;
  /** ISO 8601 en UTC. */
  createdAt: string;
  items: { productId: number; name: string; quantity: number; unitPrice: number }[];
};

export type LoginResult = { token: string; user: User };

export type CheckoutResult = { order: Order; pointsAwarded: number; pointsBalance: number };

export type FavoriteResult = {
  productId: number;
  isFavorite: boolean;
  pointsAwarded: number;
  pointsBalance: number;
};
