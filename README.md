# Interrapidisimo — take-home

Mini e-commerce con catálogo de productos y una capa simple de gamificación.

> **Estado del proyecto:** en construcción. Este README se completa en el commit
> `docs:` del plan de `specs/00-overview.md` §9. Por ahora solo documenta cómo
> levantar el andamiaje.

## Requisitos

- Node.js >= 22.12.0
- npm >= 10

### Notas de versiones

Todo el stack está en la última versión estable, con dos excepciones forzadas por el
Node local (22.12.0), que es el piso de Vite 8 y Vitest 5:

| Paquete | Versión | Motivo |
|---|---|---|
| `better-sqlite3` | `^12.11.1` en vez de `^13` | La v13 exige **NAPI 10**; Node 22.12.0 solo llega a NAPI 9. Con la v13 el binario nativo segfaultea al abrir la base de datos. |
| `jsdom` | `^28.0.0` en vez de `^30` | La v30 exige Node `^22.22.2` y no instala en 22.12.0. La v28 es la más nueva compatible. |

Si se sube Node a 24 LTS o superior, ambas se pueden devolver a `latest`.

Además, npm 11.20 exige aprobar los scripts de instalación de los paquetes nativos. Las
aprobaciones viven en el campo `allowScripts` del `package.json` raíz, para que un clone
limpio instale sin pasos manuales.

## Puesta en marcha

Es un monorepo con npm workspaces. Un solo `install` en la raíz instala backend y frontend.

```bash
npm install
cp backend/.env.example backend/.env
npm run seed
npm run dev
```

El paso de `.env` es obligatorio: el backend valida las variables con Zod al arrancar y
falla si falta `JWT_SECRET`.

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check del backend: http://localhost:3001/api/health

El servidor de desarrollo de Vite hace proxy de `/api` hacia el backend, así que no
hay CORS en desarrollo. El cliente siempre pega a rutas relativas (`/api/...`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta backend y frontend a la vez |
| `npm run build` | Compila backend y frontend |
| `npm run typecheck` | Chequeo de tipos sin emitir archivos |
| `npm run test` | Pruebas de backend y frontend |
| `npm run seed` | Crea `./backend/data/app.db` y la llena con el seed |

## Base de datos

SQLite con `better-sqlite3` y SQL directo, sin ORM. El esquema está en
`backend/src/db/schema.sql` y se aplica al abrir la base; no hay migraciones
(recorte documentado en `01-data-model.md` §8).

```bash
npm run seed   # idempotente: se puede repetir sin duplicar datos
```

Deja 5 categorías, 40 productos y estos 2 usuarios:

| Correo | Contraseña |
|---|---|
| `ana@tienda.co` | `ClaveDemo123` |
| `carlos@tienda.co` | `ClaveDemo123` |

Los datos del seed vienen de [DummyJSON](https://dummyjson.com), descargados una
vez, traducidos al español y con precios convertidos a COP. El seed no hace
llamadas de red. Para recargar todo desde cero: `rm -rf backend/data && npm run seed`.

## Contrato del API

Detalle en [`specs/02-api-contract.md`](specs/02-api-contract.md). Toda respuesta es
exactamente una de estas tres formas:

```json
{ "data": { } }
{ "data": [ ], "meta": { "page": 1, "pageSize": 12, "total": 87, "totalPages": 8 } }
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [ ] } }
```

- Los `code` son estables y son lo que el cliente usa para decidir qué mostrar. Los
  mensajes van en español.
- `authenticate` se monta una sola vez en `/api`, después de las rutas públicas: a
  partir de ahí todo lo registrado exige `Authorization: Bearer <jwt>`.
- Un 500 nunca expone trazas. El error real solo se escribe en el log del servidor.
- `AppError(status, code, message, details?)` es lo que lanzan los services; el
  middleware de errores es el único que decide la forma de un error.

Variables de entorno relevantes:

| Variable | Defecto | Para qué |
|---|---|---|
| `JWT_SECRET` | — (obligatoria, mínimo 32 caracteres) | Firma y verificación del token. Si falta o es corta, la app no arranca |
| `JWT_EXPIRES_IN` | `1h` | Vigencia del token |
| `BCRYPT_ROUNDS` | `10` | Costo de bcrypt al sembrar. Las pruebas usan `4` |
| `DATABASE_PATH` | `./data/app.db` | Ruta del archivo SQLite |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Único origen con CORS |

Se validan una sola vez al iniciar, en `backend/src/config/env.ts`. El resto del
código importa ese módulo, nunca `process.env`.

El payload del JWT lleva **solo** el id del usuario (`sub`). El correo, el nombre
y el saldo de puntos se leen de la base cuando hacen falta, para que un token
robado no sirva para averiguar el correo de nadie ni conocer un saldo que ya
cambió. Los intentos de login no tienen límite y el token vive en
`localStorage`: son riesgos conocidos, documentados en `specs/10-backend-auth.md` §6.

## Catálogo: cómo funciona y qué no

`GET /api/products` resuelve paginación, filtro por categoría y búsqueda en SQL, no
en memoria. Detalles en [`specs/10-backend-products.md`](specs/10-backend-products.md);
aquí van las limitaciones, que son decisiones y no descuido:

- **La búsqueda recorre todos los productos.** `LIKE '%texto%'` sobre una función no
  usa índice, así que con 40 filas es instantáneo y con 40 000 sería un problema. La
  salida es FTS5 o una columna normalizada e indexada, ambas para una segunda
  iteración.
- **La `ñ` se busca como `n`.** Buscar "nino" encuentra "Niño". Es el efecto del NFD
  que quita tildes, y es lo habitual en buscadores en español.
- **`%`, `_` y `\` se escapan**, así que buscar `%` no devuelve el catálogo entero. Sin
  eso, los comodines de `LIKE` serían alcanzables desde la URL.
- **El filtro de categoría usa dos sentencias, no una.** La forma de una sola
  consulta (`:category IS NULL OR c.slug = :category`) es más elegante pero hace que
  SQLite ignore `idx_products_category` y recorra la tabla siempre. Verificado con
  `EXPLAIN QUERY PLAN`. Las dos sentencias son texto fijo: ningún valor del usuario
  entra concatenado en el SQL.
- **El orden ignora el caso pero no la tilde.** `COLLATE NOCASE` solo pliega el caso de
  las letras ASCII, así que "Máscara de pestañas" queda después de "Mesa de noche": las
  tildes se comparan por byte UTF-8, donde `á` vale más que `e`. El orden sí es estable
  entre páginas, que es lo que evita que la paginación repita u omita productos. Ordenar
  por `normalize_text(name)` daría un orden más natural pero obligaría a un sort en cada
  petición.
- **Paginación por `OFFSET`.** Con 40 productos no hay problema; con muchas, el
  `OFFSET` alto empieza a recorrer filas para luego descartarlas.

## Estructura

```
backend/src/db/       # esquema, conexión y seed
backend/src/shared/   # contrato: tipos, AppError, validación, middlewares, texto
backend/src/modules/  # un módulo por feature: routes -> controller -> service -> repository
frontend/src/lib/     # apiClient y token store
frontend/src/types/   # espejo del contrato
specs/                # fuente de verdad del proyecto
AGENTS.md             # convenciones del repo
```

## Especificaciones

El alcance, el stack, la arquitectura, los contratos y el plan de commits están en
[`specs/00-overview.md`](specs/00-overview.md). El resto de specs se agrega según el
índice de esa spec.