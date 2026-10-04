# 00 — Overview

> Spec raíz del proyecto. Todas las demás specs dependen de esta.

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
- Solo los repositorios tocan SQL.
- La lógica de negocio (reglas de puntos, stock, totales) vive **solo en el servidor**.
- El `userId` siempre se obtiene del token, nunca del cuerpo ni de la URL.

## 5. Contrato de respuestas

```json
{ "data": { } }
{ "data": [ ], "meta": { "page": 1, "pageSize": 12, "total": 87, "totalPages": 8 } }
{ "error": { "code": "OUT_OF_STOCK", "message": "Sin stock suficiente", "details": [ ] } }
```

## 6. Criterios de aceptación globales

- [ ] El proyecto levanta localmente siguiendo solo el README.
- [ ] Paginación, filtro y búsqueda se resuelven en el servidor.
- [ ] Ninguna petición del cliente puede fijar o modificar puntos.
- [ ] Todas las respuestas respetan el contrato de éxito/error.
- [ ] La UI maneja carga, error y vacío en cada pantalla.
- [ ] La UI es usable en móvil, tablet y escritorio.
- [ ] El carrito se actualiza de forma optimista y revierte si el servidor falla.

## 7. Supuestos

- Moneda: pesos colombianos (COP), precios como enteros.
- Catálogo pequeño (~40 productos, 4-5 categorías).
- Imágenes referenciadas por URL desde seed (DummyJSON, traducido).
- Token JWT en `localStorage` (riesgo XSS documentado).
