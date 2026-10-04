# 20 — Frontend: favoritos

> Depende de: `20-frontend-foundation.md`, `20-frontend-auth.md` (hook `useApplyPoints`), `20-frontend-catalog.md`, `02-api-contract.md`, `10-backend-favorites.md`.
> Commit asociado: `feat(web): favorites page and optimistic toggle`.

## 1. Objetivo

Marcar y quitar favoritos con respuesta inmediata (actualización optimista), mostrar la lista de favoritos y reflejar los puntos que otorga el servidor, manteniendo coherentes el catálogo y la página de favoritos aunque se actualicen por separado.

## 2. Alcance

Incluye: `FavoriteButton` (botón de corazón de la tarjeta), la página `/favorites`, el hook de alternancia optimista y la sincronización de las cachés de productos y favoritos.

No incluye: deshacer una eliminación, favoritos sin sesión, paginación u ordenamientos de la lista, contador de favoritos en el header.

## 3. Estructura

```
frontend/src/features/favorites/
├── pages/
│   └── FavoritesPage.tsx
├── components/
│   └── FavoriteButton.tsx       # corazón de la tarjeta (pública)
├── hooks/
│   ├── useFavorites.ts          # consulta ['favorites']
│   └── useToggleFavorite.ts     # mutación optimista
├── utils/
│   └── favoritesCache.ts        # funciones puras para actualizar las cachés
├── api/
│   └── favoritesApi.ts          # getFavorites, addFavorite (PUT), removeFavorite (DELETE)
├── types/
│   └── index.ts
└── index.ts                     # exporta FavoriteButton y FavoritesPage
```

### Tarjeta compartida

La página de favoritos reutiliza la tarjeta del catálogo. Para no crear una dependencia circular entre features, `ProductCard`, `ProductCardSkeleton` y `ProductGrid` son componentes compartidos de presentación en `components/product/`. `ProductCard` recibe el producto y dos *slots* (`favoriteSlot` y `cartSlot`); cada página los rellena con `FavoriteButton` (esta feature) y `AddToCartButton` (feature del carrito), importados desde sus `index.ts`.

## 4. Datos y cachés

El estado "es favorito" aparece en dos lugares que deben mantenerse coherentes:

| Caché | Contenido |
|---|---|
| `['products', filtros]` | Páginas del catálogo; cada producto trae `isFavorite` |
| `['favorites']` | Lista de favoritos del usuario (`Product[]`, el más reciente primero) |

- `['favorites']` se consulta solo al entrar en `/favorites`, no al iniciar la sesión.
- Las claves de consulta son un contrato compartido entre features (ver convención en `20-frontend-foundation.md`); por eso esta feature puede actualizar `['products']` sin importar código del catálogo.

## 5. Alternancia optimista (`useToggleFavorite`)

`mutate({ product, next })`, donde `next` es el estado deseado (`true` marca, `false` quita). Usa `PUT /api/favorites/:id` si `next` es verdadero y `DELETE` si es falso.

1. `onMutate`:
   - Cancelar las consultas en curso de `['products']` y `['favorites']`.
   - Guardar copias de ambas cachés (todas las páginas cacheadas de `['products']` y la lista de favoritos).
   - Cambiar `isFavorite` del producto en **todas** las páginas cacheadas de `['products']`.
   - En `['favorites']` (solo si ya está en caché): añadir el producto al principio si `next` es verdadero, o quitarlo si es falso.
2. `onError`: restaurar ambas copias y mostrar un `Toast` de error según el `code`. Si el error es `PRODUCT_NOT_FOUND`, además invalidar `['products']` y `['favorites']`.
3. `onSuccess`: llamar a `applyPoints({ pointsAwarded, pointsBalance })` (ver `20-frontend-auth.md`): actualiza el saldo en `['me']` y muestra "+N puntos" solo si el servidor otorgó puntos.
4. `onSettled`: invalidar `['favorites']` y `['products']` cuando ya no queda otra mutación de favoritos en curso. Invalidar marca la caché como obsoleta aunque la lista de favoritos no esté montada, de modo que se recarga al visitarla.

Reglas:
- Las mutaciones se serializan **por producto** (`scope` por id de producto): varios clics seguidos en el mismo corazón se envían en orden y el estado final coincide con el último deseo; productos distintos pueden ir en paralelo.
- `next` se calcula a partir del estado optimista actual, de modo que un clic rápido siempre invierte lo que el usuario ve.
- El cliente **no calcula ni predice puntos**: el aviso aparece solo si la respuesta trae `pointsAwarded > 0`. Alternar un favorito ya premiado no muestra nada, y quitarlo nunca resta puntos.
- Las funciones de `favoritesCache.ts` (`withFavoriteFlag`, `withFavoriteAdded`, `withFavoriteRemoved`) son puras y están probadas por separado.

## 6. `FavoriteButton`

- Props: el `product` (usa `id`, `name` e `isFavorite`).
- Icono de corazón (`Heart`): contorno cuando no es favorito y relleno con el color `secondary` cuando lo es.
- Accesibilidad: botón con `aria-pressed` que refleja el estado y una etiqueta fija que incluye el nombre ("Marcar como favorito: {nombre}"). Zona táctil de al menos 44 px.
- Es optimista: no muestra spinner; el cambio visual es inmediato y se corrige si el servidor falla.
- En la tarjeta se superpone en una esquina de la imagen, con fondo `neutral` semitransparente para que se vea sobre cualquier foto.

## 7. Página `/favorites`

- Ruta protegida; `h1` "Favoritos" (`font-display`) y, junto a él, el número de productos.
- Cuadrícula responsiva (`ProductGrid`) de `ProductCard` con `FavoriteButton` y `AddToCartButton` en sus slots. Sin paginación (el servidor devuelve todos los favoritos).
- Quitar un favorito desde esta página hace desaparecer la tarjeta al instante (optimista) y se restaura si el servidor falla.
- Un producto agotado se muestra con "Agotado" y su botón de agregar deshabilitado, igual que en el catálogo.

### Estados

| Situación | Qué se muestra |
|---|---|
| Primera carga | `ProductCardSkeleton` × 8 con el mismo layout que la cuadrícula |
| Error al cargar | `ErrorState` con "Reintentar" |
| Vacío | `EmptyState` con icono de corazón, "Aún no tienes favoritos", la descripción "Marca productos con el corazón para encontrarlos aquí." y el botón "Explorar catálogo" (lleva a `/`) |
| Con favoritos | Cuadrícula de tarjetas |

El texto del estado vacío no menciona cantidades de puntos: las reglas viven solo en el servidor.

## 8. Accesibilidad

- El corazón es un botón real operable con `Tab`, `Enter` y `Espacio`, con `aria-pressed`.
- El cambio de número de favoritos en la página se anuncia con `aria-live="polite"`.
- Tras quitar una tarjeta con el teclado, el foco pasa al encabezado de la página para no perderse.

## 9. Casos de prueba

Pruebas con Vitest y Testing Library, con el `apiClient` simulado:

Botón:
- [ ] `aria-pressed` refleja `isFavorite` y la etiqueta incluye el nombre del producto.
- [ ] Al hacer clic, el estado cambia de inmediato, antes de que responda el servidor.
- [ ] La primera vez se muestra "+N puntos" con el `pointsAwarded` del servidor y el saldo en `['me']` pasa a ser `pointsBalance`.
- [ ] Cuando el servidor responde `pointsAwarded: 0`, no se muestra aviso y el saldo queda como lo devolvió el servidor.
- [ ] Cinco clics rápidos en el mismo corazón envían las peticiones en orden y el estado final coincide con el último deseo.
- [ ] Si falla la petición, el corazón vuelve a su estado anterior y aparece el aviso de error.

Cachés:
- [ ] Marcar desde el catálogo actualiza `isFavorite` en **todas** las páginas cacheadas de `['products']` y añade el producto a `['favorites']` si estaba en caché.
- [ ] Quitar desde `/favorites` quita la tarjeta al instante y pone `isFavorite: false` en las páginas cacheadas del catálogo.
- [ ] El error restaura ambas cachés a su estado previo.
- [ ] `PRODUCT_NOT_FOUND` restaura y refresca `['products']` y `['favorites']`.
- [ ] Tras terminar las mutaciones se invalidan `['favorites']` y `['products']` una sola vez, no por cada clic.
- [ ] Funciones puras de `favoritesCache.ts`: marcan, añaden al principio y quitan sin mutar el original.

Página:
- [ ] Muestra skeletons al cargar, `ErrorState` con reintento, y el vacío con "Explorar catálogo" que navega a `/`.
- [ ] Muestra las tarjetas en el orden recibido y un producto agotado aparece como "Agotado" con el botón de agregar deshabilitado.
- [ ] El vacío no menciona cantidades de puntos.
- [ ] Ninguna acción de favoritos calcula puntos en el cliente.

## 10. Criterios de aceptación

- [ ] Marcar y quitar favoritos es inmediato y se corrige si el servidor falla.
- [ ] El catálogo y la página de favoritos nunca se contradicen, estén o no cargadas las dos cachés.
- [ ] Los puntos mostrados provienen solo de la respuesta del servidor y el aviso aparece solo cuando se otorgaron.
- [ ] Alternar un favorito repetidamente no genera avisos de puntos falsos ni inconsistencias.
- [ ] La página maneja carga, error y vacío con los componentes compartidos.
- [ ] El corazón es accesible por teclado y lector de pantalla.
- [ ] La feature no importa archivos internos de otras features; la tarjeta compartida recibe los botones por *slots*.

## 11. Fuera de alcance

- Deshacer la eliminación de un favorito.
- Favoritos sin sesión o guardados en el navegador.
- Paginación, ordenamiento o búsqueda dentro de la lista de favoritos.
- Contador de favoritos en el header, listas compartidas o con nombre.
- Tope de puntos por favoritos.
