# 20 — Frontend: catálogo

> Depende de: `20-frontend-foundation.md`, `20-frontend-auth.md`, `02-api-contract.md`, `10-backend-products.md`.
> Commits asociados: `feat(web): API client, auth and catalog with URL filters` y `feat(web): loading, error and empty states, responsive layout`.

## 1. Objetivo

Mostrar el catálogo con filtro por categoría, búsqueda por nombre y paginación, consumiendo el servidor. Los filtros viven en la URL, la búsqueda tiene debounce, las peticiones viejas se cancelan y la pantalla maneja explícitamente carga, error y vacío.

## 2. Alcance

Incluye la página `/` (catálogo), el filtro de categorías, el buscador, la cuadrícula de productos, la paginación y la tarjeta de producto.

No incluye: página de detalle de producto, ordenamientos, filtros por precio, scroll infinito. Las acciones de la tarjeta (favorito y agregar al carrito) las implementan las features de favoritos y carrito; el catálogo solo las compone.

## 3. Estructura

```
frontend/src/features/catalog/
├── pages/
│   └── CatalogPage.tsx
├── components/
│   ├── CatalogFilters.tsx         # buscador + categorías
│   ├── SearchInput.tsx
│   ├── CategoryFilter.tsx
│   ├── ProductGrid.tsx
│   ├── ProductCard.tsx
│   ├── ProductCardSkeleton.tsx
│   └── Pagination.tsx
├── hooks/
│   ├── useCatalogFilters.ts       # lee y escribe los filtros en la URL
│   ├── useProducts.ts
│   └── useCategories.ts
├── api/
│   └── catalogApi.ts              # getProducts(), getCategories()
├── types/
│   └── index.ts                   # CatalogFilters
└── index.ts                       # API pública de la feature
```

### Comunicación entre features

Una feature solo importa de otra a través de su `index.ts` (su API pública). `ProductCard` usa:
- `FavoriteButton` desde `features/favorites`.
- `AddToCartButton` desde `features/cart`.

Así el catálogo no conoce cómo se guardan los favoritos ni cómo se calcula el carrito, y esas features siguen siendo dueñas de sus mutaciones, de la actualización optimista y de los puntos.

## 4. Filtros en la URL

La URL es la **única fuente de verdad** de los filtros: `/?category=<slug>&q=<texto>&page=<n>`.

`useCatalogFilters` devuelve `{ category, q, page }` y estas acciones:

| Acción | Efecto en la URL |
|---|---|
| `setCategory(slug | undefined)` | Cambia la categoría y **reinicia** la página a 1. Usa `push` |
| `setQuery(texto)` | Cambia la búsqueda y **reinicia** la página a 1. Usa `replace` (escribir no llena el historial) |
| `setPage(n)` | Cambia la página conservando los demás filtros. Usa `push` |
| `clearFilters()` | Quita categoría y búsqueda y vuelve a la página 1 |

Reglas:
- Los valores por defecto no aparecen en la URL (`page=1`, `q` vacío, sin categoría).
- Una `page` inválida (`abc`, `0`, negativa, decimal) se trata como 1 y la URL se corrige con `replace`.
- `q` se recorta; un texto de solo espacios equivale a vacío.
- La categoría no se valida contra la lista del servidor: un slug desconocido llega al API, que responde lista vacía, y la pantalla muestra el estado vacío con "Limpiar filtros".
- Al cambiar de categoría o de búsqueda siempre se vuelve a la página 1, para no quedar en una página que ya no existe.
- La paginación conserva siempre `category` y `q`.

## 5. Buscador

- Campo `type="search"` con etiqueta accesible "Buscar productos", texto de ayuda "Buscar por nombre", `maxLength` de 100 y botón para borrar (icono `X`).
- El texto escrito vive en estado local. Tras **300 ms** sin teclear (`useDebounce`) se escribe en la URL con `setQuery`.
- `Enter` aplica la búsqueda de inmediato (sin esperar el debounce) y el botón de borrar limpia al instante.
- Si la URL cambia por navegación (atrás/adelante o "Limpiar filtros"), el campo refleja el nuevo valor sin provocar un bucle de escritura (se recuerda el último valor que el propio campo escribió).
- La búsqueda ignora mayúsculas y tildes en el servidor; el cliente no normaliza nada.

## 6. Categorías

- `useCategories` consulta `['categories']` con un `staleTime` largo (las categorías casi no cambian).
- `CategoryFilter` muestra la opción **"Todas"** más las categorías devueltas por el API. **Ninguna categoría está escrita a mano en el cliente.**
- Presentación: botones tipo "chip" en una fila con desplazamiento horizontal en móvil; el seleccionado se distingue con fondo `primary` y texto `neutral`, y cada botón usa `aria-pressed`.
- Cargando: chips en `Skeleton`. Error: aviso breve en línea con botón "Reintentar"; **el catálogo sigue funcionando sin el filtro** (un fallo de categorías no bloquea los productos).

## 7. Consulta de productos

`useProducts(filters)`:
- Clave: `['products', { category, q, page }]` (cada combinación se cachea sola).
- Parámetros al API: `page`, `pageSize` (constante `CATALOG_PAGE_SIZE = 12`), `category` y `q` solo si tienen valor.
- Recibe el `signal` de TanStack Query y lo pasa a `apiClient`, de modo que una búsqueda o página vieja se **cancela** al cambiar los filtros y nunca pisa a la nueva.
- Mantiene los datos anteriores mientras llegan los nuevos (`placeholderData: keepPreviousData`), para que la lista no parpadee.
- Si `page` supera `meta.totalPages` y hay resultados en otras páginas (por ejemplo, URL manipulada), se corrige con `replace` a la última página válida.

## 8. Cuadrícula y tarjeta

### Diseño responsivo
- Cuadrícula de 1 columna en móvil, 2 desde `sm`, 3 desde `lg` y 4 desde `xl`.
- Encabezado de la página con `h1` "Catálogo" (`font-display`) y, al lado, el total de resultados ("N productos"), anunciado con `aria-live="polite"`.

### `ProductCard`
Contenido, de arriba abajo:
- Imagen con `ProductImage` (proporción fija, `loading="lazy"`, reemplazo si falla) y, superpuesto en una esquina, `FavoriteButton`.
- Categoría (etiqueta pequeña en mayúsculas), nombre del producto y precio con `formatCOP`.
- Indicador de stock: `stock === 0` muestra la insignia "Agotado"; con 5 unidades o menos muestra "Últimas N unidades".
- `AddToCartButton`, deshabilitado cuando el producto está agotado.

La tarjeta no enlaza a un detalle (fuera de alcance) y se memoriza con `React.memo` para no re-renderizar toda la cuadrícula en cada cambio del carrito.

### `Pagination`
- Botones "Anterior" y "Siguiente" con el indicador "Página X de Y"; deshabilitados en los extremos. Se oculta si `totalPages <= 1`.
- Dentro de un `nav` con `aria-label="Paginación"`.
- Al cambiar de página, la vista vuelve al inicio de la cuadrícula (suave, salvo `prefers-reduced-motion`) y el foco pasa al encabezado de resultados.

## 9. Estados

| Situación | Qué se muestra |
|---|---|
| Primera carga (sin datos) | `ProductCardSkeleton` × `CATALOG_PAGE_SIZE` con el mismo layout que la cuadrícula |
| Cambiando filtro o página | Se mantiene la lista anterior atenuada, con `aria-busy="true"`; sin saltos de layout |
| Error al cargar productos | `ErrorState` con mensaje según el `code` y botón "Reintentar" (`refetch`); los filtros siguen usables |
| Vacío con filtros activos | `EmptyState` "No encontramos productos" mencionando la búsqueda o categoría, con botón "Limpiar filtros" |
| Vacío sin filtros | `EmptyState` "Aún no hay productos disponibles", sin acción |

Nunca se deja la zona de resultados en blanco ni con un indicador de carga indefinido.

## 10. Accesibilidad

- El buscador está en un `form` con `role="search"`; la etiqueta es visible para lectores de pantalla.
- Los botones de categoría exponen su estado con `aria-pressed`; todo es operable con teclado.
- El total de resultados se anuncia con `aria-live`; el cambio de página mueve el foco al encabezado.
- Las imágenes tienen `alt` con el nombre del producto; los iconos decorativos, `aria-hidden`.
- El botón de favorito y el de agregar al carrito tienen etiquetas descriptivas que incluyen el nombre del producto.

## 11. Relación con otras features

Las features de favoritos y carrito actualizan o invalidan las consultas `['products', ...]` (por ejemplo, para reflejar `isFavorite` o el nuevo stock tras un checkout). El catálogo no necesita saberlo: solo renderiza lo que haya en caché.

## 12. Casos de prueba

Pruebas con Vitest y Testing Library, con el `apiClient` simulado:

Filtros:
- [ ] Sin parámetros, los filtros son `category` indefinido, `q` vacío y `page` 1, y la URL queda limpia.
- [ ] `page` inválida (`abc`, `0`, `-2`) se trata como 1 y la URL se corrige.
- [ ] `setCategory` y `setQuery` reinician la página a 1; `setPage` conserva `category` y `q`.
- [ ] Los valores por defecto no aparecen en la URL.
- [ ] `clearFilters` deja la URL sin parámetros.

Buscador:
- [ ] Escribir "cam" lanza una sola petición tras 300 ms, no una por tecla.
- [ ] `Enter` busca de inmediato; el botón de borrar limpia al instante.
- [ ] Cambiar el texto rápido cancela la petición anterior (su `signal` queda abortado) y la respuesta vieja no reemplaza a la nueva.
- [ ] Al usar atrás/adelante, el campo muestra el valor de la URL.

Paginación y datos:
- [ ] Cambiar de página conserva `category` y `q` en la petición.
- [ ] La paginación se oculta con `totalPages <= 1` y deshabilita los extremos.
- [ ] Una página fuera de rango se corrige a la última válida.
- [ ] Mientras llega una página nueva se sigue mostrando la anterior.

Categorías:
- [ ] Los chips salen de la respuesta del API (nada escrito a mano) y "Todas" limpia el filtro.
- [ ] Si falla la carga de categorías, los productos siguen mostrándose.

Estados:
- [ ] Primera carga muestra los skeletons.
- [ ] Un error muestra `ErrorState` y "Reintentar" vuelve a pedir los datos.
- [ ] Lista vacía con filtros muestra "Limpiar filtros", y al pulsarlo se restablecen los filtros.
- [ ] Lista vacía sin filtros muestra el mensaje sin acción.

Tarjeta:
- [ ] Muestra el precio con formato COP y la categoría.
- [ ] Con `stock = 0` muestra "Agotado" y deshabilita el botón de agregar.
- [ ] Con `stock <= 5` muestra "Últimas N unidades".

## 13. Criterios de aceptación

- [ ] Categoría, búsqueda y página están en la URL; el botón "atrás" y los enlaces compartidos funcionan.
- [ ] La paginación conserva los filtros y cambiar un filtro siempre vuelve a la página 1.
- [ ] La búsqueda tiene debounce de 300 ms y las peticiones obsoletas se cancelan.
- [ ] La lista no parpadea al cambiar de filtro o de página.
- [ ] Carga, error y vacío están resueltos con los componentes compartidos, incluido el vacío con acción "Limpiar filtros".
- [ ] Ninguna categoría está escrita a mano en el cliente.
- [ ] La cuadrícula es usable de 1 a 4 columnas, con zonas táctiles de al menos 44 px.
- [ ] El catálogo no implementa mutaciones; compone `FavoriteButton` y `AddToCartButton` mediante la API pública de sus features.

## 14. Fuera de alcance

- Página de detalle de producto.
- Ordenamientos, filtros por precio o disponibilidad, vista de lista.
- Precarga (prefetch) de la página siguiente, scroll infinito, paginación numerada.
- Persistir la última búsqueda entre sesiones.
