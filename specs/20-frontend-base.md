# 20 — Frontend: base de la aplicación

> Depende de: `00-overview.md` (stack, tokens de diseño), `02-api-contract.md`. Es la base de las specs `20-frontend-auth`, `20-frontend-catalog`, `20-frontend-cart` y `20-frontend-favorites`.
> Commit asociado: `feat(web): API client, auth and catalog with URL filters` (la parte de infraestructura).

## 1. Objetivo

Definir la estructura, el cliente HTTP, el manejo de estado, el enrutamiento, el layout y los componentes compartidos sobre los que se construyen todas las features, de modo que cada una consuma el API y muestre carga, error y vacío de la misma manera.

## 2. Alcance

Incluye: estructura de carpetas, enrutamiento y rutas protegidas, `apiClient`, configuración de TanStack Query, layout y header, tokens de diseño en Tailwind, componentes de UI compartidos, utilidades de formato y de mensajes de error.

No incluye: lógica de cada feature (ver sus specs), modo oscuro, internacionalización, SSR/PWA ni pruebas end-to-end.

## 3. Stack y convenciones

- React + Vite + TypeScript en modo `strict`.
- React Router para el enrutamiento; TanStack Query para el estado del servidor; Tailwind CSS (mobile-first); `lucide-react` para iconos.
- Alias de importación `@/` apuntando a `src/`.
- Componentes funcionales y hooks; un componente por archivo; nombres en inglés, textos de interfaz en español.
- Sin librerías de estado global (Redux, Zustand): ver sección 6.

## 4. Estructura

```
frontend/src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx          # QueryClientProvider, AuthProvider, ToastProvider
│   ├── router.tsx
│   └── layout/
│       ├── AppLayout.tsx      # header + contenido
│       └── Header.tsx
├── api/
│   ├── apiClient.ts           # request / requestList, ApiError
│   └── queryClient.ts
├── components/ui/             # Button, Spinner, Skeleton, ErrorState, EmptyState,
│                              # Drawer, Toast, ProductImage
├── features/
│   ├── auth/                  # cada feature: pages/, components/, hooks/, api/, types/
│   ├── catalog/
│   ├── cart/
│   └── favorites/
├── hooks/
│   ├── useDebounce.ts
│   └── useApplyPoints.ts      # aplica pointsAwarded/pointsBalance a ['me'] y avisa
├── lib/
│   ├── format.ts              # formatCOP, formatPoints
│   ├── errors.ts              # getErrorMessage
│   └── tokenStorage.ts        # token en localStorage, con try/catch
├── types/
│   └── api.ts                 # contrato: ApiSuccess, ApiList, ApiErrorBody, Product, Cart...
├── styles/
│   └── index.css              # Tailwind, fuentes, variables de color
└── main.tsx
```

Reglas de organización:
- Cada feature es dueña de sus páginas, componentes, hooks, funciones de API y tipos propios. Una feature no importa archivos internos de otra; solo usa lo que está en `components/ui`, `hooks`, `lib`, `api` y `types`.
- `types/api.ts` contiene los DTO del contrato (`Product`, `Cart`, `User`, `Order`...) tal como los define `02-api-contract.md`. Los tipos que solo sirven a una feature (por ejemplo, los filtros del catálogo) viven en su carpeta `types/`.
- Las funciones de red de cada feature (`features/<x>/api/`) solo llaman a `apiClient`; no usan `fetch` directamente.

## 5. Cliente HTTP (`apiClient`)

- URL base desde `VITE_API_URL` (por defecto `http://localhost:3001/api`).
- Dos funciones: `request<T>()` devuelve el campo `data`; `requestList<T>()` devuelve `{ data, meta }`. Ambas aceptan `method`, `body` y `signal` (para cancelar peticiones con TanStack Query).
- Adjuntan `Authorization: Bearer <token>` cuando hay sesión.
- Respuesta correcta: devuelven `data` (y `meta`). Respuesta de error: lanzan `ApiError` con `status`, `code`, `message` y `details`, a partir de `{ error: { ... } }`.
- Fallos de red (`fetch` rechaza): se convierten en `ApiError` con `status: 0` y `code: 'NETWORK_ERROR'`.
- Respuesta que no es JSON válido o sin la forma esperada: `ApiError` con `code: 'UNKNOWN_ERROR'`.
- Las cancelaciones (`AbortError`) **no** se transforman: se relanzan tal cual para que TanStack Query las ignore.
- Ante `401` con `code: 'UNAUTHORIZED'` (no `INVALID_CREDENTIALS`): se invoca un manejador registrado por el `AuthProvider` que borra el token, limpia la caché de Query y redirige a `/login`. El login es la única llamada que no dispara ese manejador.
- El token se guarda en `localStorage` (riesgo de XSS documentado en el README), siempre con `try/catch` por si el almacenamiento no está disponible.

## 6. Estado

| Tipo de estado | Dónde vive |
|---|---|
| Datos del servidor (productos, categorías, carrito, favoritos, usuario) | TanStack Query |
| Filtros y página del catálogo | La URL (`?category=&q=&page=`) |
| Sesión (token, usuario autenticado) | `AuthProvider` (contexto) |
| UI efímera (carrito abierto, texto del input) | `useState` local o contexto mínimo |

### Claves de consulta

`['me']`, `['categories']`, `['products', filtros]`, `['cart']`, `['favorites']`.

### Configuración de `QueryClient`

- `staleTime`: 30 s; `refetchOnWindowFocus`: desactivado.
- Consultas: no se reintenta ante errores 4xx; se reintenta una vez ante errores de red o 5xx.
- Mutaciones: sin reintentos automáticos.

### Saldo de puntos (regla transversal)

El saldo vive en la consulta `['me']`. Toda mutación cuya respuesta incluya `pointsBalance` (favoritos y checkout) actualiza esa caché con `setQueryData` mediante un helper común, y muestra el aviso "+N puntos" solo si `pointsAwarded > 0`. El cliente nunca calcula ni suma puntos por su cuenta.

## 7. Enrutamiento

| Ruta | Página | Acceso |
|---|---|---|
| `/login` | Inicio de sesión | Pública; si ya hay sesión, redirige a `/` |
| `/` | Catálogo | Protegida |
| `/favorites` | Favoritos | Protegida |
| `*` | No encontrada | Pública |

- El carrito **no es una ruta**: es un panel lateral (`Drawer`) que se abre desde el header.
- `ProtectedRoute` redirige a `/login` si no hay sesión y recuerda la ruta de origen para volver después del login.

## 8. Layout y header

- `AppLayout`: header fijo arriba y contenido centrado con ancho máximo y márgenes laterales de 16 px en móvil.
- `Header` contiene: nombre de la tienda (constante de configuración), enlaces a Catálogo y Favoritos, **indicador de puntos** (siempre visible), botón del carrito con insignia de unidades y botón de cerrar sesión.
- En móvil los enlaces y el cierre de sesión se agrupan en un menú desplegable; el indicador de puntos y el botón del carrito permanecen visibles.
- Cerrar sesión borra el token, limpia la caché de Query y redirige a `/login`.

## 9. Diseño visual

Se implementan los tokens de `00-overview.md` (sección 8) como variables CSS mapeadas al tema de Tailwind; no se escriben colores hexadecimales sueltos en los componentes.

- Colores: `primary`, `secondary`, `tertiary`, `neutral`, `success`, `error`.
- Tipografía: Playfair Display para titulares (`font-display`) y Plus Jakarta Sans para cuerpo y etiquetas (`font-sans`), cargadas desde Google Fonts con `display=swap`.
- Radio de bordes de 6 px; iconos `lucide-react` con trazo 1.5 y tamaño base 20 px.
- Contraste: `secondary` solo en botones, iconos y texto grande; `tertiary` solo decorativo.
- Mobile-first con los puntos de quiebre por defecto de Tailwind; zonas táctiles de al menos 44 px.

## 10. Componentes compartidos (`components/ui`)

| Componente | Responsabilidad |
|---|---|
| `Button` | Variantes (primario, secundario, fantasma), tamaño y estado `loading` que deshabilita el botón |
| `Spinner` | Indicador de carga accesible (`role="status"`) |
| `Skeleton` | Placeholders con la forma del contenido para evitar saltos de layout |
| `ErrorState` | Mensaje de error amigable y botón "Reintentar"; recibe el error y la acción de reintento |
| `EmptyState` | Icono, título, descripción y acción opcional |
| `Drawer` | Panel lateral con fondo, cierre con `Esc`, atrapa el foco y bloquea el scroll del fondo |
| `Toast` | Avisos de éxito, error e información, con `aria-live="polite"` y cierre automático |
| `ProductImage` | Imagen con `loading="lazy"`, proporción fija y reemplazo visual si la URL falla |

### Patrón obligatorio de estados

Toda pantalla o sección que consuma el API resuelve explícitamente tres estados: **cargando** (skeletons), **error** (`ErrorState` con reintento) y **vacío** (`EmptyState`). Ninguna lista puede mostrarse en blanco ni quedarse con un spinner indefinido.

## 11. Utilidades

- `formatCOP(valor)`: `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`, por ejemplo `$89.900`.
- `formatPoints(valor)`: número con separador de miles en `es-CO`.
- `getErrorMessage(error)`: traduce el `code` del `ApiError` a un mensaje en español (`NETWORK_ERROR`, `UNAUTHORIZED`, `OUT_OF_STOCK`, `CART_EMPTY`, `PRODUCT_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`). La interfaz decide según el `code`, nunca analizando el texto del mensaje. Para cualquier otro error devuelve un mensaje genérico.

## 12. Accesibilidad básica

- HTML semántico (`header`, `main`, `nav`, `button`, `a`), un único `h1` por página.
- Campos de formulario con `label` asociada; errores de campo enlazados con `aria-describedby`.
- Estados de foco visibles; navegación completa por teclado, incluido el `Drawer`.
- Imágenes con `alt` (nombre del producto); iconos decorativos con `aria-hidden`.
- Cambios de saldo y avisos anunciados mediante regiones `aria-live`.

## 13. Casos de prueba

Pruebas unitarias con Vitest (solo lo crítico de la base):
- [ ] `apiClient` devuelve `data` y `meta` en respuestas correctas.
- [ ] `apiClient` lanza `ApiError` con `code`, `message` y `details` ante una respuesta de error del contrato.
- [ ] Un fallo de red produce `ApiError` con `code: 'NETWORK_ERROR'`.
- [ ] Una respuesta no JSON produce `UNKNOWN_ERROR`.
- [ ] Un `401 UNAUTHORIZED` invoca el manejador de sesión; un `401 INVALID_CREDENTIALS` no.
- [ ] Una petición cancelada relanza `AbortError` sin convertirla en `ApiError`.
- [ ] `formatCOP(89900)` produce `$89.900`.
- [ ] `getErrorMessage` devuelve el mensaje esperado para cada código conocido y uno genérico para errores desconocidos.

## 14. Criterios de aceptación

- [ ] Toda llamada al API pasa por `apiClient`; no hay `fetch` suelto en las features.
- [ ] Un token vencido o inválido cierra la sesión y lleva a `/login` sin bucles de redirección.
- [ ] Las rutas protegidas no son accesibles sin sesión.
- [ ] El indicador de puntos está visible en todas las páginas protegidas y se alimenta solo de `['me']`.
- [ ] Cada pantalla que consume el API maneja carga, error y vacío con los componentes compartidos.
- [ ] Los colores y las fuentes salen de los tokens definidos, sin valores sueltos.
- [ ] La interfaz es usable en móvil, tablet y escritorio, y el `Drawer` se maneja con teclado.
- [ ] Los errores se muestran según su `code`, con mensajes en español.

## 15. Fuera de alcance

- Modo oscuro, internacionalización, SSR, PWA.
- Pruebas end-to-end y de componentes exhaustivas.
- Monitoreo de errores y analítica.
- División del código por rutas (code splitting) y optimización avanzada de carga.
