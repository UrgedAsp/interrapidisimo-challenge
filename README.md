# Mini E-Commerce & Gamificación (Interrapidisimo)

Aplicación web full-stack de comercio electrónico con catálogo de productos, carrito persistido en el servidor, checkout atómico y un sistema de recompensas con fidelización de puntos garantizado mediante transacciones y ledger inmutable.

---

## 1. Título y descripción

Plataforma de compras en línea que implementa un catálogo filtrable y paginado con sincronización en la URL, gestión de carrito multi-dispositivo y fidelización de clientes mediante acumulación de puntos por acciones (favoritos y compras). Toda la lógica de negocio, cálculos monetarios y saldo de puntos son gobernados exclusivamente por el servidor bajo una arquitectura modular por capas.

---

## 2. Recorrido rápido (5 minutos)

Para validar todos los criterios de evaluación en orden:

1. **Iniciar sesión:** Abre `http://localhost:5173`, haz clic en uno de los botones de **Usuario de demostración** (ej. _Ana Pérez_) e inicia sesión.
2. **Buscar y filtrar:** En el catálogo, busca `camara` (sin tildes) y selecciona la categoría **Tecnología**. Nota cómo la búsqueda normaliza caracteres, el debounce evita peticiones innecesarias y la URL preserva los filtros para compartirse.
3. **Probar favoritos y puntos:** Marca un producto con el ícono de corazón. El botón responde de inmediato (actualización optimista) y el saldo en el header suma **2 puntos**. Quita el favorito y vuélvelo a marcar: comprueba que el saldo **no vuelve a aumentar** gracias al ledger idempotente.
4. **Gestionar carrito:** Agrega varios productos desde la cuadrícula y abre el panel lateral (`Drawer`). Modifica cantidades con los controles `+` y `-` observando el recálculo instantáneo del total.
5. **Finalizar compra (Checkout simulado):** Presiona **Finalizar compra**. La transacción atómica valida el stock, congela precios, crea la orden, cierra el carrito y otorga los puntos calculados (`floor(total / 1000) + 5 por producto distinto`).
6. **Comprobar persistencia:** En la pantalla de confirmación verás el resumen y los puntos ganados. Regresa al catálogo y confirma que el stock restante de los productos disminuyó y el saldo en el header está actualizado.

---

## 3. Stack tecnológico

| Capa              | Tecnologías                                                   | Justificación                                                                             |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Frontend**      | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router 7 | Renderizado rápido, tipado estricto, utilidades de diseño tokenizadas y navegación SPA.   |
| **Estado Remoto** | TanStack Query v5                                             | Gestión de caché de servidor, revalidaciones, cancelaciones y actualizaciones optimistas. |
| **Backend**       | Node.js (>= 22.12.0), Express 4, TypeScript                   | Servidor REST ligero con organización modular estricta por capas.                         |
| **Base de Datos** | SQLite con `better-sqlite3` (SQL puro)                        | Transacciones síncronas (`BEGIN IMMEDIATE`), cero sobrecarga de ORM y portabilidad total. |
| **Seguridad**     | JWT (`jsonwebtoken`), `bcryptjs`, validación Zod              | Autenticación basada en token sin estado y validación rigurosa de entradas en cada capa.  |
| **Testing**       | Vitest 5, Supertest, Testing Library (React)                  | Pruebas unitarias y de integración concurrentes en backend y frontend.                    |

---

## 4. Cómo ejecutar el proyecto

### Requisitos previos

- **Node.js**: `>= 22.12.0` (debido al soporte de NAPI 9 en `better-sqlite3` y jsdom).
- **npm**: `>= 10.0.0`.

### Instalación y configuración inicial

1. **Clonar repositorio e instalar dependencias:**

   ```bash
   git clone https://github.com/UrgedAsp/interrapidisimo-challenge.git
   cd interrapidisimo
   npm install
   ```

2. **Configurar variables de entorno:**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   _El backend valida sus variables al iniciar mediante Zod (`JWT_SECRET` requiere mínimo 32 caracteres)._

3. **Poblar la base de datos (Seed):**

   ```bash
   npm run seed
   ```

   _Genera `./backend/data/app.db` con 5 categorías, 40 productos en COP y 2 usuarios de demostración._

4. **Iniciar en desarrollo (Full-stack):**
   ```bash
   npm run dev
   ```

### URLs de acceso

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
- **Health check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Usuarios de demostración

| Nombre       | Correo             | Contraseña     | Puntos iniciales |
| ------------ | ------------------ | -------------- | ---------------- |
| Ana Pérez    | `ana@tienda.co`    | `ClaveDemo123` | 100              |
| Carlos Gómez | `carlos@tienda.co` | `ClaveDemo123` | 50               |

### Ejecución de pruebas y verificación de tipos

```bash
# Verificación de tipos TypeScript en todo el monorepo
npm run typecheck

# Compilación de producción de backend y frontend
npm run build

# Ejecutar suite de pruebas completa (270 pruebas)
npm run test
```

---

## 5. Estructura del repositorio

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Variables de entorno validadas con Zod
│   │   ├── db/              # Esquema SQL, inicialización de SQLite y scripts de seed
│   │   ├── modules/         # Módulos de negocio (auth, products, categories, cart, favorites, rewards)
│   │   │   └── [modulo]/    # routes -> controller -> service -> repository + schemas
│   │   ├── shared/          # Middlewares (auth, error), AppError, normalización de texto y tipos
│   │   ├── app.ts           # Configuración de Express y montaje de rutas
│   │   └── server.ts        # Punto de entrada y listener HTTP
│   └── tests/               # Pruebas de integración con base de datos en memoria
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente HTTP (`apiClient`) y manejo centralizado de errores
│   │   ├── components/      # UI compartida (Button, Input, Modal, Toast, Drawer, ProductCard)
│   │   ├── features/        # Módulos cliente (auth, catalog, cart, favorites)
│   │   │   └── [feature]/   # components, hooks, api, pages, utils y tests
│   │   ├── lib/             # queryClient, storage, formateadores de moneda/fecha
│   │   ├── types/           # Tipos TypeScript espejados del contrato API
│   │   └── App.tsx          # Enrutador y proveedores globales
│   └── public/              # Assets estáticos
├── specs/                   # Especificaciones funcionales y técnicas detalladas
├── AGENTS.md                # Convenciones de desarrollo y reglas del repositorio
└── README.md                # Documentación principal
```

---

## 6. Arquitectura y decisiones técnicas

- **Capas por módulo (`routes → controller → service → repository`)**: Se separó la infraestructura de la lógica de negocio sin sobrecargar con DDD innecesario. Solo los repositorios ejecutan SQL.
- **SQL directo con SQLite (`better-sqlite3`)**: Se descartó el uso de ORMs pesados para mantener control absoluto sobre el plan de ejecución de consultas y garantizar transacciones ACID síncronas (`BEGIN IMMEDIATE`).
- **Contrato de respuesta único y predecible**: Todo endpoint responde con `{ data }`, `{ data, meta }` o `{ error: { code, message, details } }`. El frontend mapea códigos de error estables (`UNAUTHORIZED`, `OUT_OF_STOCK`, etc.) a mensajes contextuales en español.
- **Autoridad absoluta del servidor**: El cliente jamás calcula precios, totales ni puntos; el `userId` se extrae estrictamente del JWT validado en cada petición.
- **Checkout transaccional atómico**: Valida disponibilidad de stock, fija precios históricos en `order_items`, descuenta inventario, marca el carrito como comprado y registra los puntos en una única transacción de base de datos.
- **Ledger de puntos inmutable**: Cada ganancia de puntos se asienta como un registro en `points_ledger` con restricción única `(user_id, action, reference_id)`, garantizando que el saldo de `users.points_balance` siempre sea el reflejo exacto de la suma de movimientos.
- **Búsqueda sin tildes ni mayúsculas**: Implementación de función personalizada `normalize_text()` registrada en SQLite y compartida con el frontend (NFD + remoción de diacríticos).
- **Frontend modular por Features con Slots**: `ProductCard` y `ProductGrid` reciben acciones mediante _slots_ (`cartSlot`, `favoriteSlot`) evitando dependencias circulares entre `catalog`, `cart` y `favorites`.
- **TanStack Query y Filtros en la URL**: Los filtros de catálogo (`category`, `search`, `page`) residen en la URL (`useSearchParams`), permitiendo historial de navegación, recarga y enlaces compartibles sin pérdida de estado.
- **Actualizaciones optimistas**: Tanto el carrito como los favoritos actualizan su estado visual inmediatamente y aplican _rollback_ silencioso con notificación Toast si el servidor rechaza la operación.
- **Semilla desacoplada de la red**: Los datos iniciales fueron obtenidos de DummyJSON, convertidos a pesos colombianos (COP), traducidos al español y empaquetados localmente en JSON.

---

## 7. API y Contrato de Comunicación

Documentación completa en [`specs/02-api-contract.md`](specs/02-api-contract.md).

| Método   | Endpoint                     | Protegido | Descripción                                                              |
| -------- | ---------------------------- | :-------: | ------------------------------------------------------------------------ |
| `GET`    | `/api/health`                |    No     | Estado del servicio y timestamp                                          |
| `POST`   | `/api/auth/login`            |    No     | Autenticación por correo y contraseña; retorna JWT y usuario             |
| `GET`    | `/api/auth/me`               |    Sí     | Obtiene datos y saldo actualizado del usuario autenticado                |
| `GET`    | `/api/categories`            |    Sí     | Listado de categorías disponibles                                        |
| `GET`    | `/api/products`              |    Sí     | Catálogo paginado con filtros (`category`, `search`, `page`, `pageSize`) |
| `GET`    | `/api/cart`                  |    Sí     | Obtiene el carrito activo con ítems, subtotales y total                  |
| `POST`   | `/api/cart/items`            |    Sí     | Agrega un producto al carrito o incrementa su cantidad                   |
| `PATCH`  | `/api/cart/items/:productId` |    Sí     | Actualiza la cantidad exacta de un ítem                                  |
| `DELETE` | `/api/cart/items/:productId` |    Sí     | Elimina un ítem del carrito                                              |
| `POST`   | `/api/cart/checkout`         |    Sí     | Ejecuta la compra atómica y retorna orden y puntos ganados               |
| `GET`    | `/api/favorites`             |    Sí     | Lista de productos favoritos del usuario                                 |
| `PUT`    | `/api/favorites/:productId`  |    Sí     | Marca favorito y otorga puntos (idempotente)                             |
| `DELETE` | `/api/favorites/:productId`  |    Sí     | Desmarca el producto de favoritos (no altera puntos)                     |

---

## 8. Reglas del sistema de puntos (Gamificación)

Detalle de especificación en [`specs/03-rewards.md`](specs/03-rewards.md).

| Acción                 |        Puntos otorgados         | Regla y Condición                                                                                                    |
| ---------------------- | :-----------------------------: | -------------------------------------------------------------------------------------------------------------------- |
| **Marcar Favorito**    |            **2 pts**            | Se otorga **una sola vez por producto**. Alternar el favorito múltiples veces no suma puntos adicionales.            |
| **Completar Compra**   | `floor(total / 1000) + (5 × N)` | `1 pt` por cada \$1.000 COP del total pagado + `5 pts` de bonificación por cada producto distinto (_N_) en la orden. |
| **Agregar al Carrito** |            **0 pts**            | No otorga puntos (decisión anti-abuso).                                                                              |

### Alternativas descartadas y justificación

- _Puntos por agregar al carrito:_ Descartado por ser altamente vulnerable a manipulación (usuarios llenando carritos para inflar saldo y abandonándolos).
- _Restar puntos al desmarcar favorito:_ Descartado para mantener el historial del ledger como registros positivos inmutables y evitar saldos negativos imprevistos.
- _Tope diario de puntos:_ Pospuesto para la segunda iteración.

---

## 9. Supuestos del negocio

- **Usuarios preexistentes:** No se implementó registro abierto; el sistema opera con usuarios sembrados.
- **Moneda:** Todos los precios se manejan en Pesos Colombianos (COP) en números enteros.
- **Checkout simulado:** La compra simula la transacción comercial; no existe pasarela de pago real ni débito bancario.
- **Puntos acumulativos:** Los puntos solo se ganan; no existe funcionalidad de canje o redención en esta versión.
- **Unicidad de carrito:** Cada usuario tiene exactamente un carrito activo (`status = 'open'`) a la vez.
- **Política de inventario:** El stock no se bloquea al agregar al carrito; la reserva formal se efectúa al momento del checkout (prioridad a quien complete la orden primero).
- **Imágenes:** Provistas mediante URLs públicas optimizadas con carga diferida (`loading="lazy"`).

---

## 10. Recortes y Plan para Segunda Iteración

### Funcionalidades recortadas en esta entrega:

1. Registro de usuarios, recuperación de contraseña y actualización de perfil.
2. Refresh tokens y almacenamiento en cookies `httpOnly` con rotación.
3. Canje de puntos acumulados como cupón de descuento en el checkout.
4. Historial y detalle de órdenes pasadas (`GET /api/orders`).
5. Bloqueo temporal de stock con expiración de carrito.
6. Motor de búsqueda con SQLite FTS5 y paginación por cursor para catálogos masivos.
7. Módulo administrativo (CRUD de productos/categorías y roles de usuario).
8. Pruebas End-to-End con Playwright/Cypress.

### Orden de prioridad para una segunda fase:

1. **Seguridad reforzada:** Autenticación vía cookies seguras `httpOnly` con refresh token y rate limiting en login.
2. **Canje de recompensas:** Permitir redimir puntos por descuentos directos en el checkout.
3. **Historial de compras:** Vista de órdenes previas con detalle de ítems y puntos obtenidos.
4. **Reserva temporal de stock:** Retención de inventario con expiración de 15 minutos en el carrito.
5. **Búsqueda avanzada:** Implementación de FTS5 para búsquedas complejas y soporte de sinónimos.

---

## 11. Limitaciones y riesgos conocidos

- **Almacenamiento de Token en `localStorage`:** Simplifica la implementación pero presenta riesgo si existiera una vulnerabilidad XSS.
- **Ausencia de Rate Limiting:** El endpoint `/api/auth/login` no restringe intentos fallidos consecutivos.
- **Concurrencia en SQLite:** SQLite opera con un único escritor simultáneo (`WAL mode`). Es óptimo para la escala de la prueba, pero requeriría migrar a PostgreSQL para escalabilidad horizontal masiva.
- **Límite intrínseco de puntos por favoritos:** El puntaje máximo obtenible mediante favoritos está acotado por la cantidad total de productos en el catálogo (`40 × 2 = 80 pts`).

---

## 12. Cobertura de Pruebas

Se implementó una suite de pruebas automatizadas con **270 pruebas pasando al 100%**:

```bash
# Backend: 218 tests en 14 suites
✓ Autenticación (login, tokens JWT expirados/inválidos, rutas protegidas).
✓ Catálogo (búsqueda con normalización, paginación, filtros combinados).
✓ Carrito (cálculo de totales, restricciones de stock, idempotencia).
✓ Checkout atómico (descuento de stock, rollback ante inconsistencias, órdenes).
✓ Sistema de recompensas y Ledger (anti-abuso en favoritos, fórmulas de checkout).

# Frontend: 52 tests en 6 suites
✓ Cliente API e interceptores de error.
✓ Autenticación, persistencia de sesión y ProtectedRoute.
✓ Catálogo (sincronización con URL searchParams, debounce y cancelación).
✓ Carrito y actualización optimista de cantidades.
✓ Alternancia de favoritos y reflejo dinámico del saldo de puntos.
```

---

## 13. Ejercicio de Refactorización

El análisis y la propuesta de refactorización del código legado correspondiente al Ejercicio 2 se encuentran documentados en [`REFACTOR.md`](REFACTOR.md).

---

## 14. Proceso de desarrollo

El proyecto se construyó bajo una metodología **Spec-Driven Development (SDD)**:

1. Cada requerimiento, modelo de datos, contrato de API y regla de negocio se especificó previamente en la carpeta `specs/`.
2. `AGENTS.md` fijó las convenciones del código (idioma de UI en español, identificadores en inglés, arquitectura por capas y verificación estricta de compilación/tests).
3. Cada funcionalidad fue implementada y validada contra su especificación antes de avanzar a la siguiente.

---

## 15. Tiempo dedicado

- **Diseño de especificaciones, contratos y modelado de datos:** ~2.5 horas.
- **Implementación del Backend, base de datos y tests de integración:** ~4.0 horas.
- **Implementación del Frontend, componentes UI, TanStack Query y tests:** ~4.5 horas.
- **Documentación técnica, refactorización y verificación final:** ~1.5 horas.
- **Total aproximado:** ~12.5 horas.
