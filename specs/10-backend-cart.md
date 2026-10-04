# 10 — Backend: carrito y checkout

> Depende de: `01-data-model.md`, `02-api-contract.md`, `03-rewards.md`, `10-backend-auth.md`, `10-backend-products.md`.
> Commits asociados: `feat(cart): server-side cart endpoints` (operaciones del carrito) y `feat(rewards): points ledger, favorites and checkout rewards` (el checkout, que depende de `RewardsService`).

## 1. Objetivo

Persistir el carrito del usuario en el servidor y convertirlo en una orden de forma **atómica**: validar stock, fijar precios, descontar stock y otorgar puntos en una sola transacción. El servidor es la única fuente de verdad de precios, stock y totales.

## 2. Alcance

Incluye los endpoints `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:productId`, `DELETE /api/cart/items/:productId` y `POST /api/cart/checkout` (contrato en `02-api-contract.md`).

No incluye: reserva de stock mientras el producto está en el carrito, expiración de carritos, cupones, impuestos, envío, pagos ni historial de órdenes.

## 3. Estructura

```
backend/src/modules/
├── cart/
│   ├── cart.routes.ts
│   ├── cart.controller.ts
│   ├── cart.service.ts         # operaciones del carrito
│   ├── checkout.service.ts     # transacción de checkout
│   ├── cart.repository.ts      # SQL de carts y cart_items
│   ├── cart.schema.ts          # validación Zod de params y cuerpos
│   └── cart.mapper.ts          # filas -> Cart / Order
└── orders/
    └── orders.repository.ts    # SQL de orders y order_items
```

`checkout.service.ts` usa `RewardsService` (módulo `rewards`) para los puntos; no escribe en el ledger directamente.

## 4. Reglas del carrito

- Cada usuario tiene como máximo un carrito `open` (índice único parcial). Se obtiene o se crea de forma transparente.
- El cliente nunca envía ni conoce un `cartId`: el carrito siempre se resuelve a partir de `req.user.id`. Esto elimina por diseño el acceso al carrito de otro usuario.
- Precios, subtotales y total se calculan en el servidor con los precios actuales de `products`. Ninguna petición puede fijar un precio o un total.
- `itemCount` es el total de **unidades** (suma de cantidades). `total` es la suma de `price * quantity`.
- Los ítems se devuelven en el orden en que se agregaron (`cart_items.id`).
- El stock **no se reserva** al agregar al carrito: solo se valida. Si dos usuarios tienen la última unidad, gana quien haga checkout primero y el otro recibe `409 OUT_OF_STOCK`. Se documenta en el README.
- `GET /api/cart` crea el carrito vacío si no existe (efecto secundario inocuo, necesario para que `Cart.id` siempre sea un número).

### Validación (Zod)

| Entrada | Regla |
|---|---|
| `:productId` | Entero positivo (solo dígitos) |
| `POST` cuerpo `productId` | Entero positivo |
| `POST` cuerpo `quantity` | Entero de 1 a 99; defecto 1 |
| `PATCH` cuerpo `quantity` | Entero de 1 a 99 (obligatorio) |

Fallos de validación: `422 VALIDATION_ERROR` con `details` por campo.

## 5. Operaciones

Todas devuelven `{ data: Cart }` (salvo checkout) y se ejecutan dentro de una transacción corta.

### POST /api/cart/items
1. Obtener o crear el carrito abierto.
2. Buscar el producto; si no existe: `404 PRODUCT_NOT_FOUND`.
3. `nuevaCantidad = cantidadActual + quantity`. Si supera `products.stock`: `409 OUT_OF_STOCK` con `details: [{ productId, message }]`.
4. Insertar o actualizar la fila con `INSERT ... ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = excluded.quantity`.
5. Devolver el carrito completo. **No otorga puntos.**

### PATCH /api/cart/items/:productId
1. Si no hay carrito abierto o el producto no está en él: `404 CART_ITEM_NOT_FOUND`.
2. **Fija** la cantidad (no la suma). Si supera el stock: `409 OUT_OF_STOCK`.
3. Devolver el carrito completo.

### DELETE /api/cart/items/:productId
Idempotente: si el producto no está en el carrito, no hace nada y responde igual con el carrito actual.

### GET /api/cart
Devuelve el carrito actual con ítems (`productId`, `name`, `price`, `imageUrl`, `quantity`, `stock`, `subtotal`), `itemCount` y `total`.

## 6. Checkout

`POST /api/cart/checkout`, sin cuerpo. Se ejecuta completo dentro de **una única transacción** de `better-sqlite3` abierta con `BEGIN IMMEDIATE` (adquiere el bloqueo de escritura desde el inicio y evita conflictos entre escrituras concurrentes). Si cualquier paso falla, se revierte todo.

1. Obtener el carrito abierto con sus ítems y los datos actuales de cada producto. Si no hay carrito o no tiene ítems: `409 CART_EMPTY`.
2. Verificar stock de **todos** los ítems. Si alguno no alcanza, lanzar `409 OUT_OF_STOCK` con un `details` que lista cada `productId` afectado y cuánto stock queda.
3. Calcular `total = Σ price * quantity` con los precios vigentes en ese momento.
4. Insertar la orden (`orders`) con `cart_id` único: un carrito solo puede convertirse en una orden.
5. Insertar `order_items` con `unit_price` como copia del precio actual.
6. Descontar stock producto por producto con `UPDATE products SET stock = stock - :q WHERE id = :id AND stock >= :q` y comprobar que se afectó exactamente una fila; si no, `409 OUT_OF_STOCK` (defensa ante concurrencia).
7. Cerrar el carrito: `UPDATE carts SET status = 'checked_out' WHERE id = :id AND status = 'open'`, comprobando una fila afectada.
8. Llamar a `RewardsService.awardPurchase(userId, { orderId, total, distinctProducts })` dentro de la misma transacción (ver `03-rewards.md`).
9. Confirmar la transacción y responder `201` con `{ order, pointsAwarded, pointsBalance }`.

Propiedades:
- **Atomicidad:** o se aplica todo (orden, stock, carrito cerrado, puntos) o nada.
- **Idempotencia práctica:** repetir el checkout encuentra un carrito nuevo y vacío (`409 CART_EMPTY`); no duplica orden, stock ni puntos.
- **Precio de la orden:** cambios de precio posteriores no alteran órdenes ya creadas.
- El `Order` devuelto incluye `id`, `total`, `createdAt` e `items` con `productId`, `name`, `quantity` y `unitPrice`.

## 7. Casos de prueba

Integración (supertest + SQLite en memoria):

Carrito:
- [ ] `GET /api/cart` de un usuario nuevo devuelve carrito vacío (`items: []`, `itemCount: 0`, `total: 0`).
- [ ] Agregar un producto lo deja en el carrito con subtotal, `itemCount` y `total` correctos.
- [ ] Agregar el mismo producto dos veces suma las cantidades.
- [ ] Agregar más unidades que el stock: `409 OUT_OF_STOCK`; un producto con stock 0 también.
- [ ] Producto inexistente: `404 PRODUCT_NOT_FOUND`.
- [ ] `quantity` 0, 100, 1.5 o texto, y `productId` inválido: `422 VALIDATION_ERROR` con `details`.
- [ ] `PATCH` fija la cantidad (no suma); `PATCH` de un producto ausente: `404 CART_ITEM_NOT_FOUND`; `PATCH` sobre el stock: `409`.
- [ ] `DELETE` quita el producto; repetirlo responde `200` sin error.
- [ ] Dos usuarios distintos tienen carritos independientes.
- [ ] Ninguna operación del carrito cambia el saldo de puntos.
- [ ] Sin token: `401 UNAUTHORIZED` en todas las rutas.

Checkout:
- [ ] Checkout exitoso: crea la orden con el total correcto, guarda `order_items` con `unit_price`, descuenta stock, cierra el carrito y devuelve `pointsAwarded` y `pointsBalance`.
- [ ] Tras el checkout, `GET /api/cart` devuelve un carrito nuevo y vacío con otro `id`.
- [ ] Carrito vacío: `409 CART_EMPTY`.
- [ ] Stock insuficiente en uno de varios ítems: `409 OUT_OF_STOCK` con los `productId` afectados, y no cambia nada (ni stock, ni carrito, ni órdenes, ni puntos).
- [ ] Si el precio de un producto cambia después de agregarlo, el checkout usa el precio nuevo y la orden lo refleja.
- [ ] Segundo checkout inmediato: `409 CART_EMPTY`, sin puntos ni descuento de stock adicionales.
- [ ] Dos checkouts simultáneos del mismo usuario: uno responde `201` y el otro `409`; stock y puntos se aplican una sola vez.
- [ ] Rollback: si `awardPurchase` falla a propósito (mock), no queda orden, el stock sigue igual y el carrito sigue abierto.
- [ ] Invariante: `points_balance` coincide con la suma de `points_ledger` tras el checkout.

## 8. Criterios de aceptación

- [ ] El carrito persiste en el servidor y se resuelve siempre por el usuario del token.
- [ ] Precios, subtotales y totales los calcula el servidor; el cliente no puede influir en ellos.
- [ ] Agregar o modificar el carrito nunca otorga puntos.
- [ ] El checkout es atómico, valida stock dentro de la transacción y deja el stock siempre ≥ 0.
- [ ] Reintentar un checkout no duplica órdenes, stock ni puntos.
- [ ] Las órdenes conservan el precio de compra.
- [ ] Los errores usan los códigos y el formato del contrato.
- [ ] El README documenta que el stock no se reserva en el carrito y que el checkout es simulado.

## 9. Fuera de alcance

- Reserva de stock, expiración o limpieza de carritos abandonados.
- Cupones, descuentos, impuestos, costos de envío, direcciones.
- Pagos reales y canje de puntos.
- Historial y consulta de órdenes.
- Varios carritos por usuario.
