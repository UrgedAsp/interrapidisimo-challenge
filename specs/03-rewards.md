# 03 — Sistema de recompensas

> Depende de: `01-data-model.md`, `02-api-contract.md`. Commit asociado: `feat(rewards): points ledger, favorites and checkout rewards`.

## 1. Objetivo

Otorgar puntos por interactuar con la tienda, con reglas y cálculo **exclusivamente en el servidor**. El cliente nunca envía ni decide puntos: solo muestra el saldo que devuelve el API. El diseño debe impedir ganar puntos de forma repetida o artificial.

## 2. Reglas de puntos

| Acción | Puntos | Se otorga | Referencia en el ledger |
|---|---|---|---|
| `FAVORITE` — marcar un producto como favorito | 2 | Una sola vez por usuario y producto, de por vida | `productId` |
| `PURCHASE` — completar el checkout | `floor(total / 1000)` + 5 por cada producto distinto comprado | Una vez por orden | `orderId` |

Qué **no** otorga puntos: agregar, quitar o cambiar la cantidad de productos en el carrito, quitar un favorito, ni volver a marcar un favorito ya premiado.

### Detalles del cálculo de compra

- `total` es el total de la orden calculado en el servidor con los precios vigentes de la base de datos (nunca con datos del cliente).
- `floor(total / 1000)` equivale a 1 punto por cada $1.000 COP completos.
- "Producto distinto" cuenta cada producto una vez, sin importar la cantidad comprada.
- Una compra siempre otorga al menos 5 puntos (hay al menos un producto), por lo que cumple `CHECK (points > 0)` del ledger.

### Ejemplos

| Caso | Cálculo | Puntos |
|---|---|---|
| 1 producto de $89.900 (x1) | `floor(89900/1000)` = 89, + 5 | **94** |
| 2 unidades de $45.000 y 1 de $120.000 (total $210.000, 2 productos) | 210 + 10 | **220** |
| 1 producto de $15.500 | 15 + 5 | **20** |
| Marcar un favorito por primera vez | — | **2** |
| Quitar el favorito y volver a marcarlo | — | **0** |

## 3. Mecanismo anti-abuso

Cada premio se registra en `points_ledger` con una restricción única `(user_id, action, reference)`. La base de datos rechaza cualquier premio repetido, incluso con peticiones simultáneas.

- **Favoritos:** premiar un favorito equivale a insertar la fila `(user, 'FAVORITE', productId)`. Si ya existe, no se otorga nada. Quitar el favorito no borra la fila del ledger, por eso volver a marcarlo no vuelve a pagar.
- **Compra:** la referencia es el `orderId`, y como `orders.cart_id` es único, un carrito solo produce una orden y, por tanto, un único premio.
- **Sin reversión:** ninguna acción revoca puntos ya otorgados. Es más simple, más fácil de auditar y evita saldos inconsistentes.
- **Saldo:** se actualiza en la **misma transacción** que la inserción en el ledger. Invariante: `users.points_balance = SUM(points_ledger.points)` del usuario.

## 4. Diseño en el backend

Ubicación: `backend/src/modules/rewards/`.

```
rewards/
├── rewards.config.ts       # constantes de las reglas
├── rewards.calculator.ts   # funciones puras de cálculo
├── rewards.repository.ts   # acceso al ledger y al saldo
└── rewards.service.ts      # RewardsService
```

- **Constantes** (en código, no en variables de entorno, para que las reglas queden versionadas junto con el código):
  - `FAVORITE_POINTS = 2`
  - `PURCHASE_BLOCK_SIZE = 1000`
  - `PURCHASE_BONUS_PER_PRODUCT = 5`
- **Calculador:** `calculatePurchasePoints(total, distinctProducts): number`, función pura sin acceso a la base de datos, fácil de probar.
- **RewardsService** expone dos operaciones, ambas pensadas para ejecutarse dentro de una transacción abierta por quien las llama:
  - `awardFavorite(userId, productId) → { pointsAwarded, pointsBalance }`
  - `awardPurchase(userId, order) → { pointsAwarded, pointsBalance }`
- **Concesión idempotente:** se intenta `INSERT ... ON CONFLICT DO NOTHING` en el ledger. Si se insertó una fila, se suma al saldo; si no, `pointsAwarded` es `0` y el saldo no cambia.
- El módulo de favoritos y el de checkout llaman a `RewardsService`; ninguna otra parte del código escribe en `points_ledger` ni en `points_balance`.

## 5. Contrato con el frontend

- `PUT /api/favorites/:productId` y `POST /api/cart/checkout` devuelven `pointsAwarded` y `pointsBalance` (ver `02-api-contract.md`).
- El frontend actualiza el indicador con `pointsBalance` y muestra un aviso "+N puntos" solo cuando `pointsAwarded > 0`.
- El frontend no calcula, estima ni suma puntos por su cuenta. El saldo inicial viene de `GET /api/me`.

## 6. Reglas consideradas y descartadas (para el README)

| Alternativa | Motivo del descarte |
|---|---|
| Puntos por agregar al carrito | Abusable: se puede llenar el carrito, quitar casi todo y comprar solo un producto quedándose con los puntos de todo |
| Restar puntos al quitar del carrito | Funciona, pero complica el ledger (movimientos negativos) y es más difícil de auditar |
| Tope diario de puntos | Reduce el abuso sin eliminarlo y exige un número arbitrario; queda para una segunda iteración |
| Bono fijo por compra | El monto y el bono por producto ya premian el valor y la variedad de la compra |

**Riesgo conocido:** marcar todo el catálogo como favorito otorga puntos una sola vez por producto, por lo que el máximo está acotado (2 × cantidad de productos). Mitigación futura: tope total de puntos por favoritos.

## 7. Casos de prueba

Pruebas unitarias (calculador):
- [ ] Los tres ejemplos de la sección 2 producen 94, 220 y 20.
- [ ] Un total menor a $1.000 con un producto produce 5.
- [ ] Mismo producto con cantidad 10 cuenta como un solo producto distinto.

Pruebas de integración (supertest + SQLite en memoria):
- [ ] Marcar favorito por primera vez: `pointsAwarded = 2` y el saldo sube 2.
- [ ] Marcar el mismo favorito otra vez: `pointsAwarded = 0`, saldo sin cambios.
- [ ] Quitar y volver a marcar un favorito: no otorga puntos.
- [ ] Dos `PUT` simultáneos al mismo favorito: los puntos se otorgan una sola vez.
- [ ] Agregar, cambiar o quitar productos del carrito: el saldo no cambia.
- [ ] Checkout exitoso: puntos según la fórmula, ledger con una fila `PURCHASE` y saldo actualizado.
- [ ] Checkout fallido (sin stock): no hay puntos, ni orden, ni cambio de stock.
- [ ] Reintento de checkout: `409 CART_EMPTY`, sin puntos adicionales.
- [ ] Invariante: tras cualquier secuencia de acciones, `points_balance` coincide con la suma del ledger.
- [ ] Enviar `points` o `pointsAwarded` en el cuerpo de cualquier petición no tiene efecto.

## 8. Criterios de aceptación

- [ ] Las reglas de la sección 2 se cumplen tal cual y viven solo en `rewards/`.
- [ ] Ninguna ruta acepta puntos desde el cliente.
- [ ] Repetir una acción premiada nunca otorga puntos adicionales.
- [ ] El saldo y el ledger son siempre consistentes (invariante verificada por prueba).
- [ ] El README documenta las reglas, las alternativas descartadas y el riesgo conocido.

## 9. Fuera de alcance

- Canje o gasto de puntos, caducidad de puntos, niveles o insignias.
- Tope diario o total de puntos.
- Historial de puntos visible para el usuario (el ledger existe, pero no hay endpoint que lo exponga).
