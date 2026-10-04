# 20 — Frontend: carrito y confirmación de compra

> Depende de: `20-frontend-foundation.md`, `20-frontend-auth.md` (hook `useApplyPoints`), `20-frontend-catalog.md`, `02-api-contract.md`, `10-backend-cart.md`.
> Commit asociado: `feat(web): cart with optimistic updates and points indicator`.

## 1. Objetivo

Un carrito funcional (agregar, cambiar cantidad, quitar, ver total) con **actualización optimista** de la interfaz, y un checkout que termina en una pantalla de confirmación con el detalle de la orden y los puntos ganados. El servidor es la fuente de verdad: lo que devuelve reemplaza siempre lo que la interfaz estimó.

## 2. Alcance

Incluye: botón del carrito en el header, panel lateral (`Drawer`), filas con selector de cantidad, resumen con total, checkout, vista de confirmación post-checkout, botón "Agregar al carrito" de la tarjeta de producto.

No incluye: historial de órdenes, cupones, notas, direcciones, pagos, deshacer una eliminación, carrito sin sesión.

## 3. Estructura

```
frontend/src/features/cart/
├── components/
│   ├── CartButton.tsx          # botón del header con insignia (pública)
│   ├── CartDrawer.tsx          # panel; alterna entre carrito y confirmación (pública)
│   ├── CartItemRow.tsx
│   ├── QuantityStepper.tsx
│   ├── CartSummary.tsx         # unidades, total y botón de checkout
│   ├── OrderConfirmation.tsx
│   └── AddToCartButton.tsx     # botón de la tarjeta de producto (pública)
├── hooks/
│   ├── useCart.ts              # consulta ['cart']
│   ├── useAddToCart.ts
│   ├── useUpdateCartItem.ts
│   ├── useRemoveCartItem.ts
│   └── useCheckout.ts
├── utils/
│   └── cartMath.ts             # funciones puras para el estado optimista
├── api/
│   └── cartApi.ts              # getCart, addItem, updateItem, removeItem, checkout
├── types/
│   └── index.ts
├── CartDrawerProvider.tsx      # abierto/cerrado, vista y última orden
└── index.ts                    # exporta CartButton, CartDrawer, AddToCartButton, CartDrawerProvider
```

- Los DTO `Cart`, `CartItem`, `Order` y `CheckoutResult` (`{ order, pointsAwarded, pointsBalance }`) están en `types/api.ts`.
- El header (capa `app`) importa `CartButton` y `CartDrawer` desde `features/cart`; el catálogo importa `AddToCartButton`.

## 4. Datos del carrito

- `useCart`: consulta `['cart']` cargada al iniciar la sesión (alimenta la insignia del header).
- Todas las respuestas de carrito del API traen el carrito completo; esa respuesta se escribe en `['cart']` como estado definitivo.
- `itemCount` es el total de **unidades**; el total en pesos lo calcula el servidor.

## 5. Actualización optimista

Aplica a agregar, cambiar cantidad y quitar. Patrón común a las tres mutaciones (TanStack Query):

1. `onMutate`: cancelar consultas en curso de `['cart']`, guardar una copia del estado anterior y escribir en caché el carrito estimado (con `cartMath`).
2. `onError`: restaurar la copia anterior y mostrar un `Toast` de error según el `code`. Si el error es `OUT_OF_STOCK`, además invalidar `['cart']` y `['products']` para traer el stock real.
3. `onSuccess`: escribir en `['cart']` el carrito que devolvió el servidor, que **reemplaza** la estimación.
4. `onSettled`: invalidar `['cart']` solo cuando ya no queda otra mutación del carrito en curso (`isMutating === 1`), para que una respuesta tardía no pise el estado optimista de una acción posterior.

Reglas:
- Las mutaciones del carrito se ejecutan **en serie** (mismo `scope` de TanStack Query), de modo que varios clics rápidos se envían en orden y el estado final coincide con el último valor del servidor.
- `cartMath` contiene funciones puras (`withItemAdded`, `withQuantity`, `withoutItem`, `recalc`) que recalculan subtotales, `itemCount` y `total` **solo para mostrar** durante la espera. No determinan precios: el servidor recalcula todo y su respuesta manda.
- Si el carrito aún no está en caché cuando se pulsa "Agregar", no se hace estimación y se espera la respuesta del servidor.
- Ninguna operación del carrito otorga puntos ni los modifica.

## 6. Componentes

### `AddToCartButton` (en la tarjeta de producto)
- Texto "Agregar al carrito" con icono `ShoppingBag`; su etiqueta accesible incluye el nombre del producto.
- Envía `POST /api/cart/items` con `quantity: 1`; es optimista, por lo que no muestra spinner.
- Deshabilitado si `stock === 0`, y también si la cantidad ya en el carrito alcanza el stock (con el texto "Máximo en el carrito").
- Varios clics rápidos suman varias unidades, en serie.

### `CartButton` (header)
- Icono de carrito con insignia de unidades (oculta si es 0; se muestra "99+" si pasa de 99).
- `aria-label` con el número de unidades, `aria-haspopup="dialog"`; abre el panel.
- Una región `aria-live="polite"` anuncia los cambios de unidades.

### `CartDrawer`
Panel lateral (componente `Drawer` compartido): ancho completo en móvil y ancho máximo en pantallas mayores; título "Tu carrito" con botón de cerrar; cierre con `Esc` o clic en el fondo; foco atrapado y scroll del fondo bloqueado.

Tiene dos vistas: **carrito** y **confirmación**.

### `CartItemRow`
- Miniatura (`ProductImage`), nombre, precio unitario con `formatCOP`, `QuantityStepper`, subtotal y botón de quitar (icono `Trash2`, `aria-label` "Quitar {nombre} del carrito").
- Si `quantity > stock` (el stock bajó): aviso "Solo quedan N" en la fila y el checkout queda deshabilitado hasta ajustar.

### `QuantityStepper`
- Botones − y + con la cantidad en medio (no editable por teclado, para simplificar).
- Cada clic envía `PATCH` con la cantidad **absoluta** resultante.
- Mínimo 1 (el − se deshabilita; para eliminar se usa el botón de quitar); máximo `min(stock, 99)`.
- Etiquetas accesibles con el nombre del producto y la cantidad actual.

### `CartSummary`
- Muestra unidades y total (`formatCOP`) y el botón **"Finalizar compra"** (ancho completo, con estado `loading`).
- El botón está deshabilitado si el carrito está vacío, si hay un checkout en curso, si hay otras mutaciones del carrito pendientes, o si algún ítem supera el stock.

## 7. Estados del panel (vista carrito)

| Situación | Qué se muestra |
|---|---|
| Primera carga | Filas en `Skeleton` |
| Error al cargar | `ErrorState` con "Reintentar" |
| Carrito vacío | `EmptyState` "Tu carrito está vacío" con botón "Explorar productos" (cierra el panel y lleva al catálogo) |
| Con productos | Lista de filas y resumen con total |

## 8. Checkout y confirmación

### Flujo
1. "Finalizar compra" ejecuta `POST /api/cart/checkout` (sin estimación optimista: la compra no se simula en el cliente).
2. Al tener éxito (`CheckoutResult`):
   - Se llama a `applyPoints(result, { notify: false })`, que actualiza el saldo en `['me']` (la confirmación ya muestra los puntos, así no se duplica el aviso).
   - Se guarda la orden en `CartDrawerProvider` y el panel pasa a la vista de **confirmación**, sin mostrar de nuevo el carrito anterior.
   - Se invalida `['cart']` (el servidor ya creó un carrito nuevo y vacío), `['products']` y `['favorites']` (cambió el stock).

### Vista de confirmación (`OrderConfirmation`)
- Icono de éxito (`CheckCircle`, color `success`) y título "¡Compra realizada!".
- Número de orden, lista de productos con cantidad y subtotal (usando `unitPrice` de la orden), y total.
- Puntos: "Ganaste N puntos" y "Ahora tienes X puntos" (a partir de `pointsAwarded` y `pointsBalance`).
- Botón **"Seguir comprando"**: cierra el panel y reinicia la vista.
- Cerrar el panel por cualquier vía (`Esc`, fondo, X) también reinicia la vista; al reabrirlo se ve el carrito (vacío). La confirmación no persiste.
- El foco se mueve al título de la confirmación y el cambio se anuncia con `aria-live`.

### Errores del checkout

| Código | Comportamiento |
|---|---|
| `OUT_OF_STOCK` (con `details`) | Se mantiene la vista del carrito y se muestra una alerta (`role="alert"`) con cada producto afectado y las unidades que quedan (nombres tomados del carrito); se invalidan `['cart']` y `['products']` para refrescar el stock y los selectores de cantidad |
| `CART_EMPTY` | Alerta "Tu carrito está vacío" y se refresca `['cart']` |
| `NETWORK_ERROR` / `INTERNAL_ERROR` | Alerta "No pudimos confirmar tu compra. Revisa tu carrito antes de reintentar", y se refrescan `['cart']` y `['me']` para reflejar si la compra llegó a completarse |
| `UNAUTHORIZED` | Lo resuelve el manejador global de sesión |

El botón se deshabilita mientras la petición está en curso, así que un doble clic no envía dos checkouts (el servidor además lo tolera).

## 9. Sesión

Al cerrar sesión (o expirar), el panel se cierra y `CartDrawerProvider` reinicia su estado; la caché de TanStack Query ya se limpia en el cierre de sesión.

## 10. Accesibilidad

- Panel como diálogo modal: `role="dialog"`, `aria-modal`, título enlazado con `aria-labelledby`, foco atrapado y devuelto al botón del carrito al cerrar.
- Todos los botones del carrito tienen etiquetas que incluyen el nombre del producto.
- Cambios de unidades, errores y confirmación se anuncian con regiones `aria-live` o `role="alert"`.
- Operable completamente con teclado; zonas táctiles de al menos 44 px.

## 11. Casos de prueba

Pruebas con Vitest y Testing Library, con el `apiClient` simulado:

Actualización optimista:
- [ ] Al agregar, la insignia sube de inmediato, antes de que responda el servidor.
- [ ] Si el servidor falla, se restaura el estado anterior y aparece el aviso de error.
- [ ] La respuesta del servidor reemplaza la estimación (si difiere, la interfaz muestra los valores del servidor).
- [ ] Tres clics rápidos en "Agregar" envían tres peticiones en orden y el estado final coincide con el último valor del servidor, sin parpadeos.
- [ ] `PATCH` envía la cantidad absoluta; el + se deshabilita en `min(stock, 99)` y el − en 1.
- [ ] Quitar un producto lo elimina de inmediato y se revierte si falla.
- [ ] `OUT_OF_STOCK` al agregar revierte, muestra el aviso y refresca el stock.

Botones y estados:
- [ ] "Agregar" está deshabilitado con `stock = 0` y cuando la cantidad en el carrito alcanza el stock.
- [ ] El panel muestra skeleton al cargar, `ErrorState` con reintento y el vacío con "Explorar productos".
- [ ] Una fila con `quantity > stock` muestra el aviso y deshabilita el checkout.
- [ ] El botón de checkout está deshabilitado con carrito vacío, con checkout en curso y con mutaciones pendientes.

Checkout:
- [ ] Un checkout correcto muestra la confirmación con número de orden, productos, total, puntos ganados y nuevo saldo.
- [ ] Tras el checkout, `['me']` tiene el nuevo saldo, el carrito se vuelve a consultar vacío y `['products']` y `['favorites']` se invalidan.
- [ ] La confirmación no duplica el aviso "+N puntos".
- [ ] Cerrar el panel (`Esc`, fondo o X) reinicia la vista y al reabrirlo se ve el carrito vacío.
- [ ] `OUT_OF_STOCK` en el checkout mantiene el carrito, muestra la alerta con los productos afectados y refresca el stock.
- [ ] `CART_EMPTY` y `NETWORK_ERROR` muestran sus mensajes y refrescan los datos.
- [ ] Un doble clic en "Finalizar compra" envía una sola petición.
- [ ] Ninguna operación del carrito modifica el saldo ni muestra avisos de puntos.

Sesión y accesibilidad:
- [ ] Cerrar sesión cierra el panel y reinicia su estado.
- [ ] El panel atrapa el foco, se cierra con `Esc` y devuelve el foco al botón del carrito.

## 12. Criterios de aceptación

- [ ] Agregar, cambiar cantidad y quitar responden de inmediato (optimista) y se corrigen con lo que dice el servidor.
- [ ] Un fallo de red o del servidor nunca deja el carrito en un estado inconsistente.
- [ ] El cliente no decide precios, stock ni puntos: solo muestra lo que devuelve el servidor.
- [ ] El checkout termina en una confirmación clara con la orden y los puntos ganados.
- [ ] Tras comprar, el catálogo muestra el stock actualizado y el saldo de puntos del header es el nuevo.
- [ ] Carga, error y vacío del panel están resueltos con los componentes compartidos.
- [ ] El panel es utilizable en móvil y escritorio, y con teclado y lector de pantalla.

## 13. Fuera de alcance

- Historial y detalle de órdenes posteriores a la confirmación.
- Deshacer la eliminación de un producto.
- Cantidad editable escribiendo el número, cupones, notas, direcciones y pagos.
- Carrito sin sesión o persistido en el navegador.
