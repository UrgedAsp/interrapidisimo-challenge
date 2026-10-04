# 02 — Contrato del API

> Depende de: `00-overview.md`, `01-data-model.md`. Commits asociados: `feat(api): response contract, AppError and error middleware` y los de cada módulo (auth, products, cart, rewards).

## 1. Convenciones generales

- Prefijo de todas las rutas: `/api`. Cuerpos y respuestas en JSON (`application/json`).
- Autenticación: cabecera `Authorization: Bearer <jwt>`. **Todos los endpoints requieren token salvo `POST /api/auth/login`.**
- El `userId` se obtiene siempre del token, nunca del cuerpo, la URL ni la query.
- Dinero: enteros en pesos colombianos (COP). Fechas: ISO 8601 en UTC.
- Campos de las respuestas en `camelCase`.
- Validación de entrada con Zod en cada endpoint. Cualquier fallo de esquema es `422 VALIDATION_ERROR`.
- CORS habilitado solo para el origen del frontend (configurable por variable de entorno).
- Sin límite de peticiones (rate limiting): recorte documentado.

## 2. Forma de las respuestas

Toda respuesta tiene exactamente una de estas formas.

**Éxito**
```json
{ "data": { } }
```

**Éxito con listado paginado**
```json
{
  "data": [ ],
  "meta": { "page": 1, "pageSize": 12, "total": 87, "totalPages": 8 }
}
```

**Error**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [ { "field": "quantity", "message": "Debe ser un entero entre 1 y 99" } ]
  }
}
```

Reglas:
- `details` es opcional y es siempre un arreglo cuando existe.
- Los mensajes de error van en español; los `code` son estables y son lo que usa el cliente para decidir qué mostrar.
- Un error 500 nunca expone trazas ni mensajes internos.
- Las respuestas de éxito pasan por un helper común; los errores, por un único middleware.

## 3. Tipos del contrato (TypeScript)

Se definen en `backend/src/shared/types.ts` y se duplican en `frontend/src/types/api.ts`.

```ts
type ApiSuccess<T> = { data: T };
type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };
type ApiList<T> = { data: T[]; meta: PageMeta };

type ErrorDetail = { field?: string; message: string; productId?: number };
type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] };
};

type Category = { id: number; name: string; slug: string };

type Product = {
  id: number;
  name: string;
  price: number;        // COP, entero
  imageUrl: string;
  stock: number;
  category: Category;
  isFavorite: boolean;  // del usuario autenticado
};

type CartItem = {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stock: number;
  subtotal: number;     // price * quantity
};

type Cart = { id: number; items: CartItem[]; itemCount: number; total: number };

type User = { id: number; name: string; email: string; pointsBalance: number };

type Order = {
  id: number;
  total: number;
  createdAt: string;
  items: { productId: number; name: string; quantity: number; unitPrice: number }[];
};
```

## 4. Endpoints

### 4.1 Auth

#### `POST /api/auth/login`
- Cuerpo: `{ "email": string, "password": string }`
- 200: `{ data: { token: string, user: User } }`
- Errores: `422 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` (mismo mensaje si el correo no existe o la contraseña falla).

#### `GET /api/me`
- 200: `{ data: User }`
- Errores: `401 UNAUTHORIZED`.

### 4.2 Catálogo

#### `GET /api/categories`
- 200: `{ data: Category[] }` ordenado por nombre.

#### `GET /api/products`
- Query:

| Parámetro | Tipo | Defecto | Regla |
|---|---|---|---|
| `page` | entero | 1 | ≥ 1 |
| `pageSize` | entero | 12 | 1 a 50 |
| `category` | string | — | `slug` de categoría |
| `q` | string | — | se recorta; máx. 100 caracteres; búsqueda por nombre, sin distinguir mayúsculas |

- Orden fijo y estable: `name ASC, id ASC` (necesario para que la paginación sea consistente).
- 200: `ApiList<Product>`. Filtro, búsqueda y paginación se resuelven en SQL.
- Un `category` inexistente o una búsqueda sin coincidencias devuelve `200` con `data: []` y `total: 0`. Una `page` mayor al total también devuelve lista vacía con el `meta` real.
- Errores: `422 VALIDATION_ERROR` (por ejemplo `page=0` o `pageSize=999`).
- `isFavorite` se calcula en la misma consulta para el usuario autenticado, así el cliente no necesita pedir los favoritos por separado.

### 4.3 Carrito

El carrito abierto del usuario se obtiene o se crea en el servidor de forma transparente. Todas las operaciones devuelven el carrito completo actualizado.

#### `GET /api/cart`
- 200: `{ data: Cart }` (si no hay ítems: `items: []`, `itemCount: 0`, `total: 0`).

#### `POST /api/cart/items`
- Cuerpo: `{ "productId": number, "quantity"?: number }` (`quantity` entero de 1 a 99, defecto 1).
- Si el producto ya está en el carrito, **suma** la cantidad.
- 200: `{ data: Cart }`
- Errores: `422 VALIDATION_ERROR`, `404 PRODUCT_NOT_FOUND`, `409 OUT_OF_STOCK` (si la cantidad resultante supera el stock).
- No otorga puntos.

#### `PATCH /api/cart/items/:productId`
- Cuerpo: `{ "quantity": number }` (entero de 1 a 99; **fija** la cantidad, no la suma).
- 200: `{ data: Cart }`
- Errores: `422 VALIDATION_ERROR`, `404 CART_ITEM_NOT_FOUND`, `409 OUT_OF_STOCK`.

#### `DELETE /api/cart/items/:productId`
- Idempotente: si el producto no estaba en el carrito, responde igual.
- 200: `{ data: Cart }`
- Errores: `422 VALIDATION_ERROR` (id inválido).

#### `POST /api/cart/checkout`
- Sin cuerpo. Dentro de **una sola transacción**: valida stock, crea la orden y sus ítems con el precio vigente, descuenta stock, cierra el carrito, registra los puntos en el ledger y actualiza el saldo.
- 201:
```json
{
  "data": {
    "order": { },
    "pointsAwarded": 95,
    "pointsBalance": 120
  }
}
```
- Errores: `409 CART_EMPTY`, `409 OUT_OF_STOCK` (con `details` indicando los `productId` afectados). Si falla, no se aplica ningún cambio.
- Reintentar tras un checkout exitoso encuentra un carrito nuevo y vacío (`409 CART_EMPTY`): no se pueden duplicar puntos ni descontar stock dos veces.

### 4.4 Favoritos

#### `GET /api/favorites`
- 200: `{ data: Product[] }` (todos con `isFavorite: true`; sin paginación por el tamaño del catálogo).

#### `PUT /api/favorites/:productId`
- Idempotente: marcar un favorito ya marcado no cambia nada.
- 200: `{ data: { productId, isFavorite: true, pointsAwarded, pointsBalance } }`
- `pointsAwarded` es `0` si ese premio ya se había otorgado antes.
- Errores: `422 VALIDATION_ERROR`, `404 PRODUCT_NOT_FOUND`.

#### `DELETE /api/favorites/:productId`
- Idempotente. No revoca puntos.
- 200: `{ data: { productId, isFavorite: false, pointsAwarded: 0, pointsBalance } }`

## 5. Catálogo de errores

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | JSON mal formado |
| 401 | `UNAUTHORIZED` | Token ausente, inválido o vencido |
| 401 | `INVALID_CREDENTIALS` | Correo o contraseña incorrectos |
| 404 | `PRODUCT_NOT_FOUND` | El producto no existe |
| 404 | `CART_ITEM_NOT_FOUND` | El producto no está en el carrito (PATCH) |
| 404 | `ROUTE_NOT_FOUND` | Ruta inexistente |
| 409 | `OUT_OF_STOCK` | Cantidad solicitada supera el stock |
| 409 | `CART_EMPTY` | Checkout con carrito vacío |
| 422 | `VALIDATION_ERROR` | Fallo de validación de entrada |
| 500 | `INTERNAL_ERROR` | Error inesperado (mensaje genérico) |

## 6. Implementación

- `AppError(status, code, message, details?)` en `shared/`; los services la lanzan.
- Un middleware de errores al final de Express: convierte `AppError`, `ZodError` (a 422) y JSON inválido (a 400); cualquier otro error se registra en el log y responde 500 genérico.
- Un middleware `notFound` para rutas inexistentes.
- Un middleware `auth` que valida el JWT y deja `req.user.id`.
- Helpers `ok(res, data)` y `okList(res, data, meta)` para las respuestas de éxito.
- En el frontend, un único `apiClient` que devuelve `data` en éxito y lanza `ApiError` con `code`, `message` y `details` en error.

## 7. Criterios de aceptación

- [ ] Todos los endpoints responden con la forma de éxito o de error descrita, sin excepciones (incluidos 404 de ruta y 500).
- [ ] Sin token, todos los endpoints salvo login responden `401 UNAUTHORIZED`.
- [ ] `GET /api/products` aplica paginación, categoría y búsqueda en SQL, con orden estable.
- [ ] Parámetros inválidos devuelven `422` con `details` por campo.
- [ ] Agregar al carrito más unidades que el stock devuelve `409 OUT_OF_STOCK`.
- [ ] Quitar dos veces el mismo producto del carrito o de favoritos no produce error.
- [ ] Marcar el mismo favorito dos veces devuelve `pointsAwarded: 0` la segunda vez, y el saldo no cambia.
- [ ] El checkout es atómico: ante cualquier fallo, stock, carrito y puntos quedan intactos.
- [ ] Ninguna petición permite enviar puntos; el cuerpo de las peticiones no tiene campos de puntos.
- [ ] Un error 500 no expone detalles internos.

## 8. Fuera de alcance

- Versionado del API, rate limiting, documentación OpenAPI.
- Paginación de favoritos y de órdenes; historial de órdenes (`GET /orders`).
- Refresh de tokens, cierre de sesión en servidor.
