# 99 — Plan del README

> Depende de: todas las specs anteriores. Commit asociado: `docs: README with architecture, point rules and assumptions`.
> Esta spec define **qué debe contener el README** y reúne el material acumulado en las demás specs. El README se escribe al final, con el proyecto funcionando, y todo lo que afirme se verifica contra el código.

## 1. Objetivo

Que quien evalúe la prueba pueda, en pocos minutos: levantar el proyecto, recorrer las funciones principales, entender las decisiones de arquitectura, conocer las reglas de puntos y ver con claridad qué se recortó y por qué. La prueba indica que los supuestos y recortes documentados son parte de la evaluación.

## 2. Reglas de redacción

- Idioma: español. Tono directo y técnico, sin lenguaje promocional.
- Extensión orientativa: unas 250 líneas. El detalle largo vive en `specs/` y el README lo enlaza en lugar de copiarlo.
- Cada decisión importante lleva su motivo en una frase ("se hizo X porque Y").
- Todo comando, ruta, variable, regla y credencial que aparezca debe coincidir con el código real.
- Sin secretos ni valores reales de configuración.

## 3. Estructura del README

| # | Sección | Contenido obligatorio | Fuente |
|---|---|---|---|
| 1 | Título y descripción | Qué es el proyecto en 2 a 3 líneas; capturas de pantalla (escritorio y móvil) si hay tiempo | `00-overview.md` |
| 2 | Recorrido rápido | Pasos de 5 minutos para probarlo (ver sección 4) | — |
| 3 | Stack | Tabla con tecnologías por capa | `00-overview.md` |
| 4 | Cómo ejecutar | Requisitos (versión de Node), instalación, variables de entorno de backend y frontend, seed, arranque de ambos servicios, URLs, usuarios de demostración, cómo correr las pruebas | Setup del proyecto |
| 5 | Estructura del repositorio | Árbol de carpetas comentado | `00-overview.md`, specs `10-*` y `20-*` |
| 6 | Arquitectura y decisiones | Decisiones con su motivo (ver sección 5) | Todas |
| 7 | API | Tabla de endpoints, formato de respuesta y de error, enlace a `specs/02-api-contract.md` | `02-api-contract.md` |
| 8 | Reglas de puntos | Tabla de reglas, alternativas descartadas y riesgo conocido (ver sección 6) | `03-rewards.md` |
| 9 | Supuestos | Lista (ver sección 7) | Todas |
| 10 | Recortes y segunda iteración | Qué se dejó fuera, por qué y en qué orden se haría (ver sección 8) | Todas |
| 11 | Limitaciones y riesgos conocidos | Lista (ver sección 9) | Todas |
| 12 | Pruebas | Qué se probó y por qué, cómo ejecutarlas | Specs `10-*` y `20-*` |
| 13 | Ejercicio de refactor | Enlace a `REFACTOR.md` | — |
| 14 | Proceso de desarrollo (opcional) | Cómo se usó el desarrollo guiado por specs y la asistencia de IA | `specs/` |
| 15 | Tiempo dedicado | Horas aproximadas, desglosadas si es posible; no penaliza | — |

## 4. Recorrido rápido (sección 2 del README)

Pasos sugeridos, pensados para recorrer todos los criterios de evaluación:

1. Iniciar sesión con un usuario de demostración.
2. Buscar un producto escribiendo sin tildes ("camara") y filtrar por categoría; observar que la paginación conserva los filtros y que la URL se puede compartir.
3. Marcar un favorito y ver cómo sube el saldo de puntos; quitarlo y volver a marcarlo para comprobar que no da puntos de nuevo.
4. Agregar productos al carrito y cambiar cantidades (actualización inmediata).
5. Finalizar la compra y ver la confirmación con el detalle de la orden y los puntos ganados.
6. Revisar que el stock del catálogo cambió y que el saldo de puntos del header es el nuevo.

## 5. Decisiones de arquitectura (material base)

- **Capas simples por módulo** (`routes → controller → service → repository`), sin DDD: el alcance no lo justifica. Solo los repositorios tocan SQL, así que cambiar de base de datos afecta solo esa capa.
- **SQLite con `better-sqlite3` y SQL directo**, sin ORM: menos configuración, transacciones síncronas y control explícito de las consultas.
- **Contrato único de respuestas**: `{ data, meta? }` o `{ error: { code, message, details? } }`, con un manejador de errores centralizado y códigos estables que el cliente usa para decidir qué mostrar.
- **Toda la lógica de negocio en el servidor**: puntos, precios, totales y stock. El `userId` sale siempre del token; el cliente nunca envía puntos ni identificadores de carrito.
- **Carrito persistido en el servidor**: sobrevive entre dispositivos y el servidor controla precios y stock.
- **Checkout transaccional**: valida stock, crea la orden con el precio de compra, descuenta stock, cierra el carrito y otorga puntos en una sola transacción; es seguro ante reintentos.
- **Ledger de puntos con restricción única** `(usuario, acción, referencia)`: el anti-abuso lo garantiza la base de datos, y el saldo siempre coincide con la suma del ledger.
- **Búsqueda sin distinguir mayúsculas ni tildes** mediante una función de normalización compartida entre código y SQL.
- **Frontend organizado por features** (páginas, componentes, hooks, API y tipos propios), con API pública (`index.ts`) entre features y componentes compartidos que reciben acciones por *slots* para evitar dependencias circulares.
- **TanStack Query para el estado del servidor**, la URL como fuente de verdad de los filtros del catálogo, debounce en la búsqueda y cancelación de peticiones obsoletas.
- **Actualización optimista** en carrito y favoritos, con mutaciones en serie y corrección con la respuesta del servidor.
- **Datos de prueba**: seed generado una vez desde una API pública (DummyJSON), traducido al español y con precios en COP, guardado en el repositorio; no hay dependencia de red al ejecutar.

## 6. Reglas de puntos (material base)

| Acción | Puntos | Condición |
|---|---|---|
| Marcar favorito | 2 | Una sola vez por producto; quitar y volver a marcar no repite |
| Compra completada | `floor(total / 1000)` + 5 por cada producto distinto | Al finalizar el checkout |

- Agregar al carrito **no** otorga puntos.
- Alternativas descartadas y motivo: puntos por agregar al carrito (abusable: llenar el carrito, quitar casi todo y comprar uno), restar puntos al quitar (complica el ledger), tope diario (queda para una segunda iteración).
- Riesgo conocido: el máximo por favoritos está acotado por el tamaño del catálogo.
- Los puntos se calculan solo en el servidor; el cliente muestra lo que este devuelve.

## 7. Supuestos (material base)

- Usuarios de demostración precargados; no hay registro.
- Un usuario tiene como máximo un carrito abierto.
- Moneda COP con precios enteros en pesos; interfaz, README y specs en español.
- **El checkout simula la compra**: no hay pasarela de pago ni saldo monetario.
- **Los puntos solo se acumulan**: no hay canje.
- El stock no se reserva al agregar al carrito: gana quien compre primero.
- Catálogo pequeño (~40 productos, 4 a 5 categorías); no se necesita caché ni búsqueda de texto completo.
- Imágenes de producto por URL; sin subida de archivos.
- El token JWT se guarda en `localStorage` en el cliente.

## 8. Recortes y segunda iteración (material base)

Orden sugerido de prioridad si hubiera más tiempo:

1. Límite de intentos de login y token en cookie `httpOnly` con refresh.
2. Canje de puntos como descuento en el checkout.
3. Historial de órdenes (`GET /orders` y página).
4. Reserva de stock con expiración.
5. Tope de puntos por favoritos y tope diario.
6. Búsqueda con FTS5 y paginación por cursor.
7. Administración de productos y categorías, y roles.
8. Migraciones de base de datos y paquete de tipos compartido entre frontend y backend.
9. Pruebas end-to-end, documentación OpenAPI, modo oscuro e internacionalización.

Recortes ya tomados: registro, refresh de token, recuperación de contraseña, roles, CRUD de productos, historial de órdenes, canje de puntos, rate limiting, migraciones, deshacer eliminaciones, pruebas end-to-end, división del código por rutas.

## 9. Limitaciones y riesgos conocidos (material base)

- Token en `localStorage`: expuesto si hubiera XSS.
- Sin límite de intentos de login: vulnerable a fuerza bruta.
- Sin reserva de stock en el carrito.
- La búsqueda recorre todos los productos (sin índice) y trata la `ñ` como `n`.
- Favoritos acotados por el tamaño del catálogo como fuente de puntos.
- `GET /api/cart` crea un carrito vacío si no existe (efecto secundario inocuo).
- SQLite con un único escritor: adecuado para el alcance, no para escalar horizontalmente.

## 10. Pruebas (sección 12 del README)

Describir, en pocas líneas, qué se cubrió y por qué:
- Backend (Vitest + supertest, SQLite en memoria): reglas de puntos y anti-abuso, checkout atómico y su rollback, concurrencia, autenticación, validación de entradas y formato de errores.
- Frontend (Vitest + Testing Library): `apiClient`, filtros en la URL, debounce y cancelación, actualización optimista con reversión, y estados de carga, error y vacío.
- Declarar que no hay pruebas end-to-end ni cobertura completa, como parte de los recortes.

## 11. Proceso de desarrollo (sección 14, opcional)

Si se incluye: explicar en pocas líneas que el proyecto se desarrolló guiado por especificaciones (`specs/`) con asistencia de IA, que la carpeta `specs/` y `AGENTS.md` documentan los requisitos, criterios de aceptación y decisiones, y que el autor revisó y validó el resultado. Es una decisión del autor; si se incluye, debe ser un resumen fiel, no un detalle extenso.

## 12. Lista de verificación antes de entregar

- [ ] Clonar el repositorio en una carpeta nueva y seguir solo el README: el proyecto levanta sin pasos ocultos.
- [ ] Los usuarios de demostración del README coinciden con los del seed y con `DEMO_USERS` del frontend.
- [ ] Las reglas de puntos del README coinciden con las constantes de `rewards.config.ts`.
- [ ] Las variables de entorno del README coinciden con los `.env.example` de ambos servicios.
- [ ] Los enlaces a `specs/`, `REFACTOR.md` y capturas funcionan.
- [ ] No hay secretos ni contraseñas reales en el repositorio ni en el historial de commits.
- [ ] Los recortes y limitaciones listados son los reales, ni más ni menos.
- [ ] Se indica el tiempo dedicado.
- [ ] El historial de commits es legible y sigue el plan de `00-overview.md`.

## 13. Criterios de aceptación

- [ ] El README contiene todas las secciones obligatorias de la tabla de la sección 3, en ese orden.
- [ ] Incluye instrucciones de ejecución, decisiones de arquitectura, reglas de puntos y supuestos, como exige la prueba.
- [ ] Los recortes, las alternativas descartadas y las limitaciones están explícitos y justificados.
- [ ] Declara que el checkout es simulado y que los puntos no se canjean.
- [ ] Enlaza a `REFACTOR.md` y a las specs.
- [ ] Cada afirmación fue verificada contra el código.

## 14. Fuera de alcance

- Documentación extensa de cada módulo (vive en `specs/`).
- Manual de usuario, guía de contribución y changelog.
- Documentación generada (OpenAPI, TypeDoc).
