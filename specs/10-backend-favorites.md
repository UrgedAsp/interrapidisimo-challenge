# 10 — Backend: favoritos

> Depende de: `01-data-model.md`, `02-api-contract.md`, `03-rewards.md`, `10-backend-auth.md`, `10-backend-products.md`. Commit asociado: `feat(rewards): points ledger, favorites and checkout rewards`.

## 1. Objetivo

Permitir marcar y quitar productos favoritos, y otorgar puntos por marcar un favorito **una sola vez por producto**, sin que alternar el favorito repetidamente permita ganar puntos de nuevo.

## 2. Alcance

Incluye `GET /api/favorites`, `PUT /api/favorites/:productId` y `DELETE /api/favorites/:productId` (contrato en `02-api-contract.md`).

No incluye: paginación de favoritos, tope total de puntos por favoritos, listas compartidas ni notas.

## 3. Estructura

```
backend/src/modules/favorites/
├── favorites.routes.ts
├── favorites.controller.ts
├── favorites.service.ts      # orquesta favorito + puntos en una transacción
├── favorites.repository.ts   # SQL de favorites
└── favorites.schema.ts       # validación Zod de :productId
```

- El listado reutiliza `products.mapper.ts`, de modo que cada favorito tiene exactamente la forma `Product` del catálogo.
- Los puntos los otorga `RewardsService.awardFavorite` (ver `03-rewards.md`). Este módulo nunca escribe en `points_ledger` ni en `points_balance`.
- El saldo que se devuelve al final se lee con `users.repository` (`findById`).

## 4. Reglas

- La tabla `favorites` guarda el **estado actual** (qué productos están marcados). El **historial de premios** vive en `points_ledger`. Son responsabilidades distintas.
- La decisión de otorgar puntos la toma siempre el ledger, no la tabla `favorites`: se intenta registrar el premio `(user, 'FAVORITE', productId)` y la restricción única decide si es nuevo.
- Quitar un favorito **no** revoca puntos y **no** borra la fila del ledger.
- Marcar un favorito ya marcado, o volver a marcar uno que se quitó, responde con éxito y `pointsAwarded: 0`.
- Se puede marcar como favorito un producto sin stock.
- El `userId` sale siempre de `req.user.id`.

### Validación (Zod)

`:productId`: entero positivo (solo dígitos). Si no cumple: `422 VALIDATION_ERROR` con `details`.

## 5. Operaciones

### GET /api/favorites
- Devuelve `{ data: Product[] }` con los favoritos del usuario autenticado, todos con `isFavorite: true`.
- Orden: los marcados más recientemente primero (`favorites.created_at DESC`, luego `product.id ASC` como desempate estable).
- Una sola consulta con `JOIN` a `products` y `categories`, sin consultas por producto.
- Sin paginación (catálogo pequeño); queda como mejora futura.

### PUT /api/favorites/:productId
Una sola transacción (`BEGIN IMMEDIATE`):
1. Si el producto no existe: `404 PRODUCT_NOT_FOUND`.
2. `INSERT INTO favorites (user_id, product_id) ... ON CONFLICT DO NOTHING`.
3. `RewardsService.awardFavorite(userId, productId)`: devuelve 2 puntos la primera vez en la vida y 0 en cualquier otro caso.
4. Responder `200` con `{ data: { productId, isFavorite: true, pointsAwarded, pointsBalance } }`.

Es idempotente: repetir la petición deja el mismo estado y nunca otorga puntos extra.

### DELETE /api/favorites/:productId
1. Borrar la fila si existe (si no existe, no hace nada).
2. Responder `200` con `{ data: { productId, isFavorite: false, pointsAwarded: 0, pointsBalance } }`.

Es idempotente. No comprueba que el producto exista: quitar algo que no está marcado es siempre un éxito.

## 6. Anti-abuso en la práctica

| Secuencia del usuario | Puntos ganados |
|---|---|
| Marcar producto A | +2 |
| Quitar A y volver a marcarlo, 10 veces | +0 |
| Marcar B | +2 |
| Marcar todo el catálogo | 2 × cantidad de productos, una sola vez |

El máximo posible por favoritos está acotado por el tamaño del catálogo. Es un riesgo conocido y documentado en el README y en `03-rewards.md`.

## 7. Casos de prueba

Integración (supertest + SQLite en memoria):
- [ ] `GET /api/favorites` de un usuario nuevo devuelve `data: []`.
- [ ] Tras marcar dos productos, el listado los devuelve con la forma `Product`, `isFavorite: true`, y el más reciente primero.
- [ ] Primer `PUT` de un producto: `pointsAwarded: 2` y el saldo sube 2.
- [ ] Segundo `PUT` del mismo producto: `pointsAwarded: 0`, saldo igual.
- [ ] `PUT`, `DELETE` y `PUT` otra vez: el segundo `PUT` da 0 puntos.
- [ ] Alternar un favorito 10 veces suma 2 puntos en total.
- [ ] `DELETE` de un producto no marcado y `DELETE` repetido: `200` sin error.
- [ ] `PUT` de un producto inexistente: `404 PRODUCT_NOT_FOUND`.
- [ ] `productId` inválido (texto, 0, decimal): `422 VALIDATION_ERROR`.
- [ ] Dos `PUT` simultáneos del mismo producto: los puntos se otorgan una sola vez.
- [ ] Un producto sin stock se puede marcar como favorito.
- [ ] Los favoritos de un usuario no aparecen para otro, y `isFavorite` en `GET /api/products` refleja solo los del usuario autenticado.
- [ ] Marcar o quitar favoritos no afecta al carrito.
- [ ] Si `awardFavorite` falla a propósito (mock), el favorito no queda guardado (rollback).
- [ ] Invariante: `points_balance` coincide con la suma de `points_ledger` tras cualquier secuencia de acciones.
- [ ] Sin token: `401 UNAUTHORIZED`.

## 8. Criterios de aceptación

- [ ] Marcar y quitar favoritos funciona de forma idempotente.
- [ ] Los puntos por favorito se otorgan una sola vez por usuario y producto, aunque se alterne el favorito.
- [ ] El módulo no escribe en el ledger ni en el saldo directamente; solo usa `RewardsService`.
- [ ] Favorito y puntos se guardan en la misma transacción.
- [ ] El listado devuelve la misma forma `Product` que el catálogo, sin consultas por producto.
- [ ] Los errores usan los códigos y el formato del contrato.

## 9. Fuera de alcance

- Paginación del listado de favoritos.
- Tope total de puntos por favoritos.
- Favoritos compartidos, listas con nombre u orden manual.
