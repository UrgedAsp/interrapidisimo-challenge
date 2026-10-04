# 10 — Backend: autenticación

> Depende de: `00-overview.md`, `01-data-model.md`, `02-api-contract.md`. Commit asociado: `feat(auth): seed-user login with JWT`.

## 1. Objetivo

Identificar al usuario en cada petición para que el servidor sepa a quién pertenecen el carrito, los favoritos y los puntos. El `userId` sale siempre del token, nunca del cliente.

## 2. Alcance

Incluye:
- `POST /api/auth/login` y `GET /api/me` (contrato en `02-api-contract.md`).
- Middleware `auth` que protege todas las demás rutas.
- Hash de contraseñas con bcrypt y firma/verificación de JWT.

No incluye (recortes documentados): registro, refresh token, cierre de sesión en servidor, recuperación de contraseña, roles, límite de intentos de login.

## 3. Estructura

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts       # /auth/login, /me
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts      # login, generación de token
│   │   └── auth.schema.ts       # esquema Zod del login
│   └── users/
│       └── users.repository.ts  # findByEmail, findById
├── middlewares/
│   └── auth.ts                  # verifica JWT y deja req.user
└── config/
    └── env.ts                   # variables de entorno validadas
```

`users.repository.ts` es la única capa que consulta la tabla `users` para autenticación.

## 4. Configuración

| Variable | Defecto | Regla |
|---|---|---|
| `JWT_SECRET` | — | Obligatoria, mínimo 32 caracteres. Si falta (fuera de pruebas), la app no arranca |
| `JWT_EXPIRES_IN` | `1h` | Duración del token |
| `BCRYPT_ROUNDS` | `10` | Las pruebas usan un valor bajo para ir rápido |

- Se entrega un `.env.example` con valores de ejemplo. El `.env` real no se versiona.
- Las variables se validan una sola vez al iniciar, en `config/env.ts`, y el resto del código importa ese módulo, no `process.env`.

## 5. Comportamiento

### Login (`POST /api/auth/login`)

1. Validar el cuerpo con Zod: `email` con formato de correo (se recorta y se pasa a minúsculas) y `password` como string no vacío de hasta 128 caracteres. No se exigen reglas de complejidad al iniciar sesión.
2. Buscar el usuario por correo (sin distinguir mayúsculas).
3. Comparar la contraseña con bcrypt. Si el usuario no existe, se compara igualmente contra un hash ficticio para que el tiempo de respuesta no revele si el correo existe.
4. Si algo falla: `401 INVALID_CREDENTIALS` con el mismo mensaje en ambos casos ("Correo o contraseña incorrectos").
5. Firmar el JWT:
   - Algoritmo `HS256` indicado explícitamente.
   - Payload mínimo: `sub` con el id del usuario. No se incluyen correo, puntos ni datos personales.
   - Expiración según `JWT_EXPIRES_IN`.
6. Responder `{ data: { token, user } }`, con `user` construido por una función de mapeo que **nunca** incluye `password_hash`.

### Middleware `auth`

1. Leer `Authorization`; el esquema debe ser `Bearer`.
2. Verificar el token con el secreto y aceptando solo `HS256` (rechaza `alg: none` y otros algoritmos).
3. Ante cualquier fallo (ausente, mal formado, firma inválida, vencido): `401 UNAUTHORIZED` con un mensaje genérico, sin distinguir el motivo.
4. Si es válido, dejar `req.user = { id }`. No se consulta la base de datos en cada petición; los usuarios no se eliminan en este alcance.

La aumentación de tipos de Express (`req.user`) se declara una vez en `shared/`.

### `GET /api/me`

Busca al usuario por `req.user.id` y devuelve `User` (id, name, email, pointsBalance). Si por alguna razón el usuario no existe, responde `401 UNAUTHORIZED`.

## 6. Seguridad

- Contraseñas guardadas solo como hash bcrypt; nunca se registran en logs ni se devuelven.
- Tampoco se registran tokens ni la cabecera `Authorization`.
- Los usuarios seed tienen contraseña de demostración, documentada en el README solo para la evaluación.
- Riesgos conocidos, documentados en el README: token en `localStorage` en el cliente (expuesto a XSS) y ausencia de límite de intentos de login (fuerza bruta).

## 7. Casos de prueba

Integración (supertest + SQLite en memoria):
- [ ] Login correcto devuelve `token` y `user` sin `password_hash`.
- [ ] Contraseña incorrecta y correo inexistente devuelven exactamente la misma respuesta `401 INVALID_CREDENTIALS`.
- [ ] El correo funciona sin importar mayúsculas y espacios alrededor.
- [ ] Cuerpo inválido (sin correo, correo mal formado, contraseña vazía) devuelve `422 VALIDATION_ERROR` con `details` por campo.
- [ ] `GET /api/me` con token válido devuelve el usuario y su saldo de puntos.
- [ ] Sin cabecera, con esquema distinto de Bearer o con token mal formado: `401 UNAUTHORIZED`.
- [ ] Token vencido: `401 UNAUTHORIZED`.
- [ ] Token firmado con otro secreto: `401 UNAUTHORIZED`.
- [ ] Token con `alg: none`: `401 UNAUTHORIZED`.
- [ ] Una ruta protegida cualquiera (por ejemplo `GET /api/products`) responde 401 sin token.

## 8. Criterios de aceptación

- [ ] Todas las rutas salvo `POST /api/auth/login` exigen un JWT válido.
- [ ] El `userId` que usan los demás módulos proviene exclusivamente de `req.user.id`.
- [ ] La app no arranca sin `JWT_SECRET` válido fuera de pruebas.
- [ ] Ninguna respuesta ni log contiene hashes, contraseñas ni tokens.
- [ ] Los errores de autenticación usan el formato y los códigos del contrato.
- [ ] Existe `.env.example` y el README explica las variables.

## 9. Fuera de alcance

- Registro, refresh token, revocación de tokens, cookies `httpOnly`.
- Roles y permisos.
- Límite de intentos de login y bloqueo de cuentas.
