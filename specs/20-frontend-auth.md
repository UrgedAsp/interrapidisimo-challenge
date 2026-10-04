# 20 — Frontend: autenticación y saldo de puntos

> Depende de: `20-frontend-foundation.md`, `02-api-contract.md`, `10-backend-auth.md`.
> Commit asociado: `feat(web): API client, auth and catalog with URL filters` (la parte de autenticación).

## 1. Objetivo

Permitir iniciar y cerrar sesión, proteger las rutas privadas, mantener la sesión entre recargas, y mostrar el saldo de puntos del usuario siempre actualizado con lo que dicta el servidor.

## 2. Alcance

Incluye:
- Página de login con formulario validado.
- `AuthProvider`, `ProtectedRoute` y cierre de sesión.
- Consulta del usuario actual (`['me']`).
- Indicador de puntos (`PointsBadge`) y el hook compartido que aplica el resultado de las acciones que otorgan puntos.

No incluye: registro, recuperación de contraseña, "recordarme", refresh de token, sincronización entre pestañas.

## 3. Estructura

```
frontend/src/
├── features/auth/
│   ├── pages/
│   │   └── LoginPage.tsx
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── DemoUsers.tsx          # usuarios de demostración
│   │   ├── ProtectedRoute.tsx
│   │   └── PointsBadge.tsx
│   ├── hooks/
│   │   ├── useAuth.ts             # acceso al contexto de sesión
│   │   ├── useLogin.ts            # mutación de login
│   │   └── useMe.ts               # consulta ['me']
│   ├── api/
│   │   └── authApi.ts             # login(), getMe()
│   ├── types/
│   │   └── index.ts               # LoginCredentials, FormErrors
│   └── AuthProvider.tsx
├── hooks/
│   └── useApplyPoints.ts          # compartido por favoritos y carrito
└── lib/
    └── tokenStorage.ts            # get/set/clear del token (con try/catch)
```

`tokenStorage` vive en `lib/` porque lo usa también `apiClient` (infraestructura compartida), que no puede depender de una feature. Los tipos `User` y `LoginResponse` son del contrato y están en `types/api.ts`.

## 4. Sesión

- `AuthProvider` guarda **solo el token** (inicializado desde `tokenStorage`). Los datos del usuario no se duplican en el contexto: salen de la consulta `['me']`, que es la única fuente.
- Expone `isAuthenticated`, `login(token)` y `logout()`.
- `login(token)`: guarda el token y actualiza el estado.
- `logout()`: borra el token, limpia toda la caché de TanStack Query y navega a `/login`.
- Al montarse, el provider registra en `apiClient` el manejador de `401 UNAUTHORIZED`, que ejecuta `logout()` con el aviso de sesión expirada.
- `ProtectedRoute` decide únicamente por la presencia del token, sin esperar a `/me`, para no mostrar un parpadeo de redirección. Si el token resulta inválido, el primer `401` cierra la sesión.
- `useMe`: `useQuery(['me'], getMe)` habilitada solo cuando hay token.

## 5. Página de login

Ruta `/login`. Si ya hay sesión, redirige a `/`.

### Composición
- Tarjeta centrada sobre el fondo `neutral`, con el nombre de la tienda en `font-display` y el `h1` "Inicia sesión".
- Campos **Correo** y **Contraseña** con `label` visible. La contraseña tiene un botón para mostrar u ocultar (icono `Eye` / `EyeOff`, con `aria-label`).
- Botón principal "Ingresar" con estado `loading`.
- Bloque de **usuarios de demostración** (`DemoUsers`): lista los correos y la contraseña del seed (los valores salen de una constante `DEMO_USERS`, que debe coincidir con el README) y un botón "Usar" que rellena el formulario. Es ayuda para quien evalúa la prueba y se documenta como solo para demo.
- Atributos de autocompletado: `autocomplete="username"` en el correo y `current-password` en la contraseña. El foco inicial va al campo de correo.

### Validación en el cliente
- Correo: obligatorio y con formato válido.
- Contraseña: obligatoria.
- Los errores se muestran junto a cada campo (enlazados con `aria-describedby`) al enviar o al salir del campo; al enviar con errores, el foco va al primer campo inválido.
- Validación manual simple, sin librerías de formularios.

### Estados y errores

| Situación | Comportamiento |
|---|---|
| Enviando | Botón en `loading` y deshabilitado; se evita el doble envío |
| `INVALID_CREDENTIALS` | Mensaje general del formulario ("Correo o contraseña incorrectos"), con `role="alert"`, sin señalar qué campo falló |
| `VALIDATION_ERROR` | Los `details[].field` se muestran en el campo correspondiente |
| `NETWORK_ERROR` / `INTERNAL_ERROR` | Mensaje general del formulario con el texto de `getErrorMessage`; el usuario puede reintentar |
| Sesión expirada (redirigido desde un `401`) | Aviso informativo arriba del formulario: "Tu sesión expiró. Inicia sesión de nuevo." |

El campo de contraseña se vacía tras un `INVALID_CREDENTIALS`.

### Flujo de éxito
1. `useLogin` llama a `POST /api/auth/login`.
2. Se ejecuta `login(token)` y se guarda el usuario devuelto con `queryClient.setQueryData(['me'], user)`, de modo que el saldo aparece de inmediato en el header sin otra petición.
3. Se navega a la ruta de origen guardada por `ProtectedRoute` (solo si es una ruta interna válida) o a `/`.

## 6. Cierre de sesión y usuario en el header

- El header muestra el nombre del usuario (desde `['me']`) y el botón "Cerrar sesión" (en el menú desplegable en móvil).
- Cerrar sesión ejecuta `logout()`: sin llamada al servidor, porque no hay revocación de tokens (recorte documentado).

## 7. Indicador de puntos (`PointsBadge`)

- Siempre visible en el header de las páginas protegidas. Muestra un icono, el saldo formateado con `formatPoints` y la etiqueta "puntos".
- Se alimenta únicamente de la consulta `['me']`:
  - Cargando: `Skeleton` del tamaño del indicador.
  - Error (que no sea `401`): muestra "—" en lugar del número.
  - Éxito: muestra el saldo.
- Es una región `aria-live="polite"`: al cambiar el saldo, el lector de pantalla lo anuncia.
- Al subir el saldo, un resaltado breve con el color `tertiary`; se desactiva con `prefers-reduced-motion`.

### Hook compartido `useApplyPoints`

Ubicación: `hooks/useApplyPoints.ts`. Lo usan las features de favoritos y carrito.

- Devuelve una función `applyPoints({ pointsAwarded, pointsBalance })`.
- Actualiza `['me']` con `setQueryData`, cambiando solo `pointsBalance`.
- Si `pointsAwarded > 0`, muestra un `Toast` de éxito "+N puntos". Si es `0`, no muestra nada y no hay efecto visible.
- Nunca calcula ni suma puntos: usa exactamente lo que devuelve el servidor.

## 8. Casos de prueba

Pruebas con Vitest y Testing Library (solo lo crítico):
- [ ] El formulario muestra errores de campo con correo vacío, correo inválido o contraseña vacía, y no llama al API.
- [ ] Un envío válido llama al login una sola vez aunque se haga doble clic.
- [ ] `INVALID_CREDENTIALS` muestra el mensaje general y vacía la contraseña.
- [ ] Un `VALIDATION_ERROR` con `details` coloca el mensaje en el campo indicado.
- [ ] Un login correcto guarda el token, deja `['me']` con el usuario y navega a la ruta de origen o a `/`.
- [ ] `ProtectedRoute` redirige a `/login` sin token y recuerda la ruta de origen.
- [ ] Con sesión iniciada, visitar `/login` redirige a `/`.
- [ ] `logout()` borra el token, limpia la caché y lleva a `/login`.
- [ ] Un `401 UNAUTHORIZED` cierra la sesión y muestra el aviso de sesión expirada, sin bucles.
- [ ] `useApplyPoints` actualiza `['me']` y muestra el aviso solo cuando `pointsAwarded > 0`.
- [ ] `PointsBadge` muestra skeleton al cargar, "—" ante error y el saldo formateado con éxito.

## 9. Criterios de aceptación

- [ ] La sesión sobrevive a recargar la página y se cierra de forma limpia con `401` o con "Cerrar sesión".
- [ ] Ninguna ruta privada se muestra sin token.
- [ ] El formulario es usable con teclado y lector de pantalla (labels, errores asociados, foco al primer error).
- [ ] No se distingue en pantalla entre correo inexistente y contraseña incorrecta.
- [ ] El saldo de puntos sale solo de `['me']` y se actualiza con lo que devuelve el servidor.
- [ ] El aviso "+N puntos" aparece solo cuando se otorgaron puntos realmente.
- [ ] El README documenta el uso de `localStorage` para el token y los usuarios de demostración.

## 10. Fuera de alcance

- Registro, recuperación de contraseña, "recordarme", inicio de sesión social.
- Refresh de token y cierre de sesión en el servidor.
- Sincronización de la sesión entre pestañas.
- Historial de puntos visible para el usuario.
