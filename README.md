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
- Health check del backend: http://localhost:3001/health

El servidor de desarrollo de Vite hace proxy de `/api` hacia el backend, así que no
hay CORS en desarrollo.

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

## Estructura

```
backend/src/db/     # esquema, conexión y seed
frontend/src/
specs/       # fuente de verdad del proyecto
AGENTS.md    # convenciones del repo
```

## Especificaciones

El alcance, el stack, la arquitectura, los contratos y el plan de commits están en
[`specs/00-overview.md`](specs/00-overview.md). El resto de specs se agrega según el
índice de esa spec.