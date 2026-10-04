# 00 — Overview

> Spec raíz del proyecto. Todas las demás specs dependen de esta. Ubicación sugerida en el repo: `specs/00-overview.md`.

## 1. Propósito

Mini e-commerce con catálogo de productos y una capa simple de gamificación (puntos por interactuar con la tienda). Se construye como prueba técnica take-home para un puesto Senior Fullstack (tiempo estimado: 2 a 4 horas).

Lo que se evalúa: criterio de ingeniería, no volumen de código. Es preferible un alcance acotado bien resuelto a uno amplio a medias. Todo recorte se documenta.

## 2. Alcance

### Dentro del alcance
- Login con usuarios seed y JWT de acceso.
- Listado de productos con paginación, filtro por categoría y búsqueda por nombre, resueltos en el servidor.
- Listado de categorías.
- Carrito persistido en el servidor (agregar, cambiar cantidad, quitar, total).
- Checkout que crea la orden, descuenta stock y otorga puntos.
- Favoritos (marcar y quitar).
- Saldo de puntos visible y actualizado en el frontend.
- Estados de carga, error y vacío en la UI.
- Diseño responsivo (mobile-first).

### Fuera del alcance (recortes documentados)
- Registro de usuarios, refresh token, recuperación de contraseña.
- Roles (admin/usuario).
- CRUD de productos y categorías (los datos entran por seed).
- Pagos reales, envíos, direcciones.
- Subcategorías o productos con varias categorías.
- Tope total de puntos por favoritos y tope diario de puntos.
- Paquete de tipos compartido entre frontend y backend (los tipos se duplican).
- Cobertura de pruebas completa (solo pruebas críticas).

## 3. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| Datos en cliente | TanStack Query |
| Estilos | Tailwind CSS (mobile-first) |
| Backend | Node.js + Express + TypeScript |
| Validación | Zod |
| Base de datos | SQLite con `better-sqlite3`, SQL directo (sin ORM) |
| Auth | bcrypt + JWT (1 h), secreto en `.env` |
| Pruebas | Vitest + supertest (solo lo crítico) |

## 4. Arquitectura

### Principios
- Capas simples, sin DDD. Se prioriza claridad sobre abstracción.
- El backend se organiza **por módulo** y cada módulo por capas: `routes → controller → service → repository`.
- Solo los repositorios tocan SQL, de modo que cambiar de base de datos afecta únicamente esa capa.
- La lógica de negocio (reglas de puntos, stock, totales) vive **solo en el servidor**. El cliente nunca decide puntos ni precios.
- El `userId` siempre se obtiene del token, nunca del cuerpo ni de la URL.

### Estructura del repositorio (monorepo)

```
/
├── backend/
├── frontend/
├── specs/
├── AGENTS.md
├── README.md
└── package.json        # script raíz para levantar ambos
```

Estructura interna de `backend/` y `frontend/`: ver specs `10-*` y `20-*`.

## 5. Contrato de respuestas

Toda respuesta del API sigue una de estas dos formas, sin excepciones:

```json
{ "data": { } }
{ "data": [ ], "meta": { "page": 1, "pageSize": 12, "total": 87, "totalPages": 8 } }
{ "error": { "code": "OUT_OF_STOCK", "message": "Sin stock suficiente", "details": [ ] } }
```

Detalle completo en `02-api-contract.md`.

## 6. Criterios de aceptación globales

- [ ] El proyecto levanta localmente siguiendo solo el README.
- [ ] Paginación, filtro y búsqueda se resuelven en el servidor.
- [ ] Ninguna petición del cliente puede fijar o modificar puntos.
- [ ] Todas las respuestas respetan el contrato de éxito/error.
- [ ] Errores con código HTTP correcto y cuerpo consistente.
- [ ] La UI maneja carga, error y vacío en cada pantalla que consume el API.
- [ ] La UI es usable en móvil, tablet y escritorio.
- [ ] El carrito se actualiza de forma optimista y revierte si el servidor falla.
- [ ] El saldo de puntos se actualiza al completar acciones que otorgan recompensas.
- [ ] El README incluye: ejecución, decisiones de arquitectura, reglas de puntos, supuestos, recortes y tiempo dedicado.
- [ ] Historia de commits legible, un commit por unidad funcional.

## 7. Supuestos

- Se usan usuarios seed; no hay registro.
- Un usuario tiene como máximo un carrito abierto.
- Moneda: pesos colombianos (COP). Los precios se almacenan como enteros en pesos (el COP no usa centavos) y se formatean en el cliente con `Intl.NumberFormat('es-CO')`.
- Interfaz, README y specs en español; identificadores de código en inglés.
- El catálogo es pequeño (unas 40 productos, 4 a 5 categorías); no se necesita caché ni búsqueda de texto completo.
- Las imágenes de productos se referencian por URL. Los datos del seed provienen de una API pública de prueba (DummyJSON), descargados una sola vez, traducidos al español, con precios convertidos a COP (tasa fija, redondeados a miles) y guardados en un JSON dentro del repo. No hay dependencia de red en tiempo de ejecución.
- El token JWT se guarda en `localStorage` en el cliente (riesgo de XSS documentado).

## 8. Diseño visual (tokens)

Estética: editorial, cálida y sobria. Se definen como variables CSS / tema de Tailwind y nunca se escriben valores hex sueltos en componentes.

### Colores

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#1C1917` | Texto principal, botones principales, header |
| `secondary` | `#B4654A` | Acentos, enlaces, botón de acción destacada (texto grande o botones) |
| `tertiary` | `#C8A97E` | Detalles decorativos, bordes, badges de puntos (nunca para texto pequeño) |
| `neutral` | `#F9F6F0` | Fondo de la app y superficies |
| `success` | `#3F6B4F` | Confirmaciones |
| `error` | `#B42318` | Errores y validaciones |

Contraste: `primary` sobre `neutral` cumple holgadamente WCAG AA. `secondary` sobre `neutral` queda cerca de 4:1, así que se reserva para texto grande, botones e iconos. `tertiary` sobre `neutral` tiene contraste bajo y es solo decorativo.

### Tipografía

| Rol | Fuente |
|---|---|
| Titulares (headline) | Playfair Display |
| Cuerpo y etiquetas (body, label) | Plus Jakarta Sans |

Se cargan desde Google Fonts con `font-display: swap`.

### Iconos y forma

- Iconos: `lucide-react`, estilo outline, trazo 1.5, tamaño base 20 px.
- Radio de bordes: 6 px (campos, botones, tarjetas).
- Sombras mínimas; se prefiere borde fino con `tertiary` a una sombra marcada.

### Imágenes de producto

- Los datos y las URLs de imágenes se cargan por seed; no hay subida de archivos ni almacenamiento de imágenes en la base de datos.
- La UI usa `loading="lazy"`, proporción fija (sin saltos de layout) y una imagen de reemplazo si la URL falla.

## 9. Plan de commits

1. `chore: scaffold backend and frontend`
2. `feat(db): schema and seed for users, categories, products`
3. `feat(api): response contract, AppError and error middleware`
4. `feat(auth): seed-user login with JWT`
5. `feat(products): paginated listing with category filter and search`
6. `feat(cart): server-side cart endpoints`
7. `feat(rewards): points ledger, favorites and checkout rewards`
8. `feat(web): API client, auth and catalog with URL filters`
9. `feat(web): cart with optimistic updates and points indicator`
10. `feat(web): loading, error and empty states, responsive layout`
11. `docs: README with architecture, point rules and assumptions`

> El ejercicio 2 (`REFACTOR.md`) se trabaja por separado y no forma parte de estas specs.

## 10. Índice de specs

| Spec | Contenido |
|---|---|
| `00-overview.md` | Este documento |
| `01-data-model.md` | Tablas, relaciones, índices, seed |
| `02-api-contract.md` | Endpoints, formato de respuesta y errores |
| `03-rewards.md` | Reglas de puntos y anti-abuso |
| `10-backend-*.md` | Una por módulo: auth, products, cart, favorites |
| `20-frontend-*.md` | Una por feature: auth, catalog, cart, favorites |
| `99-readme-plan.md` | Contenido requerido del README |