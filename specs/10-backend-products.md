# 10 — Backend: catálogo (productos y categorías)

> Depende de: `01-data-model.md`, `02-api-contract.md`, `10-backend-auth.md`. Commit asociado: `feat(products): paginated listing with category filter and search`.

## 1. Objetivo

Exponer el catálogo de solo lectura con paginación, filtro por categoría y búsqueda por nombre **resueltos en el servidor (SQL)**, y la lista de categorías para construir el filtro en el cliente.

## 2. Alcance

Incluye:
- `GET /api/products` y `GET /api/categories` (contrato en `02-api-contract.md`).
- Mapeo de filas de base de datos a los DTO `Product` y `Category`, reutilizable por otros módulos.

No incluye: crear, editar o borrar productos y categorías (los datos entran por seed), ordenamientos alternativos, filtros por precio o stock.

## 3. Estructura

```
backend/src/modules/
├── products/
│   ├── products.routes.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.repository.ts   # única capa con SQL de productos
│   ├── products.schema.ts       # validación Zod de la query
│   ├── products.schema.test.ts
│   ├── products.test.ts
│   └── products.mapper.ts       # fila -> Product (reutilizado por favoritos)
└── categories/
    ├── categories.routes.ts
    ├── categories.controller.ts
    ├── categories.service.ts
    ├── categories.repository.ts
    ├── categories.test.ts
```

El mapper se exporta para que `GET /api/favorites` devuelva exactamente la misma forma de `Product` sin duplicar código.

Para la búsqueda sin tildes se añaden dos piezas fuera del módulo:
- `shared/text.ts`: `normalizeText(texto)`, que pasa a minúsculas y elimina las tildes (`texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`).
- `db/connection.ts`: al abrir cada conexión (incluida la de las pruebas) registra en SQLite la función `normalize_text` con `db.function('normalize_text', { deterministic: true }, normalizeText)`. Así la misma lógica de normalización se usa en el código y en el SQL.

> `normalizeText` es la única definición de la normalización. Si la función registrada en SQL fuera una copia, las dos versiones podrían divergir y la búsqueda fallaría en silencio: "camara" encontraría "Camara" pero no "Cámara".

## 4. Listado de productos

### Validación de la query (Zod)

| Parámetro | Regla | Defecto |
|---|---|---|
| `page` | Entero positivo (solo dígitos), ≥ 1 | 1 |
| `pageSize` | Entero positivo, de 1 a 50 | 12 |
| `category` | `slug`: minúsculas, números y guiones, máx. 50 | — |
| `q` | String recortado, máx. 100; si queda vacío se ignora | — |

- Valores no numéricos (`2abc`), parámetros repetidos (`?page=1&page=2`) o fuera de rango producen `422 VALIDATION_ERROR` con `details` por campo.
- Los parámetros desconocidos se ignoran.
- Un parámetro **vacío** en `category` o `q` se interpreta como ausencia de filtro. La spec solo lo decía para `q`; sin extenderlo, `category=` vacío se traducía en `c.slug = ''`, que no casa con ninguna categoría y devolvía una lista vacía sin explicación.

### Consulta

Dos consultas parametrizadas para la página y dos para el total, con los mismos filtros. Todo valor del usuario entra como parámetro, nunca concatenado en el SQL.

La forma con categoría:
```sql
SELECT p.id, p.name, p.price, p.image_url, p.stock,
       c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
       EXISTS (SELECT 1 FROM favorites f
               WHERE f.user_id = :userId AND f.product_id = p.id) AS is_favorite
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE c.slug = :category
  AND (:pattern IS NULL OR normalize_text(p.name) LIKE :pattern ESCAPE '\')
ORDER BY p.name COLLATE NOCASE ASC, p.id ASC
LIMIT :pageSize OFFSET :offset;
```

La forma sin categoría es la misma con `WHERE (:pattern IS NULL OR normalize_text(p.name) LIKE :pattern ESCAPE '\')`.

> **Por qué dos y no una.** La alternativa de una sola consulta es `:category IS NULL OR c.slug = :category`, que parece más elegante pero hace que `idx_products_category` no se use nunca. Medido con `EXPLAIN QUERY PLAN`: con esa forma el plan es `SCAN p USING INDEX idx_products_name` tanto con categoría como sin ella, y el filtro se aplica después de recorrer la tabla. Con las dos sentencias, el plan con categoría es `SEARCH c USING INDEX (slug=?)` seguido de `SEARCH p USING INDEX idx_products_category`. Sin categoría vuelve a `SCAN p USING INDEX idx_products_name`, que es el índice que existe para sostener el `ORDER BY`. Contrapartida: al filtrar por categoría el orden necesita un `USE TEMP B-TREE FOR ORDER BY`, porque `idx_products_category` no está en el orden de columnas del `ORDER BY`. Con ~40 filas el coste es nulo en cualquier caso. Ninguna de las dos sentencias concatena entrada del usuario: son texto fijo, y los valores van con parámetros con nombre.

Reglas:
- `userId` viene del token. El controller lo lee con `requireUser(req)`, no con `req.user!.id`: `req.user` es opcional en el tipo porque `authenticate` no corre antes de todo, y `requireUser` convierte esa garantía en algo que el compilador verifica.
- La búsqueda construye `pattern` en este orden: normalizar lo que escribió el usuario con `normalizeText` (minúsculas y sin tildes), **escapar** `%`, `_` y `\` para que no actúen como comodines, y envolver como `%texto%`. El orden importa: escapar antes convertiría la barra invertida en `\\` y la normalización la dejaría intacta. El nombre del producto se normaliza en SQL con `normalize_text`, de modo que "camara", "CÁMARA" y "cámara" encuentran "Cámara".
- Orden fijo y estable (`name`, luego `id`): sin esto la paginación puede repetir u omitir productos entre páginas.
- `offset = (page - 1) * pageSize`.
- `isFavorite` se calcula en la misma consulta (sin consultas N+1) y se convierte de 0/1 a booleano. Sin esa conversión el JSON llevaría `isFavorite: 1` y el `=== true` del cliente fallaría sin avisar.

### Respuesta

`ApiList<Product>` con `meta`:
- `total`: cantidad de productos que cumplen los filtros.
- `totalPages = ceil(total / pageSize)` (0 si no hay resultados).
- Una `page` mayor al total devuelve `data: []` con el `meta` real. Una categoría inexistente o una búsqueda sin coincidencias devuelve `200` con lista vacía, no un error.

## 5. Listado de categorías

`GET /api/categories`: `SELECT id, name, slug FROM categories ORDER BY name`. Devuelve `{ data: Category[] }`. Es lo que el frontend usa para armar el filtro, de modo que ninguna categoría queda escrita a mano en el cliente.

## 6. Rendimiento y limitaciones

- Paginación y filtros en SQL, con índices en `products.category_id` y `products.name` (ver `01-data-model.md`). Los dos se usan: `idx_products_category` con filtro de categoría, `idx_products_name` sin él.
- `pageSize` limitado a 50 para acotar el costo de cada respuesta.
- Paginación por `OFFSET`: suficiente para ~40 productos; con catálogos grandes se usaría paginación por cursor (segunda iteración).
- La búsqueda ignora mayúsculas y tildes gracias a `normalize_text`. Efecto colateral aceptado: la `ñ` se trata como `n` (buscar "nino" encuentra "Niño"), algo habitual en búsquedas en español.
- `LIKE '%texto%'` sobre una función no usa índice y recorre todos los productos. Con ~40 es irrelevante; con un catálogo grande se usaría FTS5 o una columna normalizada indexada (segunda iteración). Se documenta en el README.
- **El orden ignora el caso pero no la tilde.** `COLLATE NOCASE` solo pliega el caso de las letras ASCII; las tildes se comparan por byte UTF-8, donde `á` (0xC3) resulta mayor que `e` (0x65). Así "Máscara de pestañas" sale después de "Mesa de noche", que a un lector en español le parece desordenado. Ordenar por `normalize_text(p.name)` daría el orden esperado a costa de un sort en cada petición, porque esa expresión no está en ningún índice. Se mantiene `COLLATE NOCASE`: la spec solo exige orden **estable**, y eso es lo que evita que la paginación repita u omita productos.
- Sin caché: el catálogo es pequeño y `isFavorite` depende del usuario.

## 7. Casos de prueba

Integración (supertest + SQLite en memoria con el seed real de `npm run seed`, que deja 5 categorías y 40 productos):

- [x] Sin parámetros: devuelve la página 1 con 12 productos y `meta` correcto.
- [x] `pageSize` y `page` devuelven el tramo esperado y no repiten productos entre páginas consecutivas.
- [x] El orden es idéntico en dos peticiones seguidas, y el desempate por `id` cubre nombres iguales.
- [x] Filtro por `category` devuelve solo productos de ese slug y `total` refleja el filtro.
- [x] La suma de los `total` por categoría da el total del catálogo, lo que prueba que el filtro se aplica en SQL y no en memoria.
- [x] `q` filtra por nombre sin distinguir mayúsculas.
- [x] Buscar sin tilde encuentra nombres con tilde ("espatula" → "Espátula de bambú") y con tilde también ("clásicas", "espátula").
- [x] "pestanas" y "pestañas" encuentran "Máscara de pestañas"; "unas" encuentra "Esmalte de uñas rojo".
- [x] `category` y `q` combinados aplican ambos filtros.
- [x] `q` con `%`, `_` o `\` se trata como texto literal, no como comodín.
- [x] Categoría inexistente o `q` sin coincidencias: `200`, `data: []`, `total: 0`, `totalPages: 0`.
- [x] `page` fuera de rango: `200`, `data: []` y `meta` real.
- [x] `page=0`, `pageSize=51`, `page=abc`, `page` repetido: `422 VALIDATION_ERROR` con `details`.
- [x] `category` con mayúsculas o símbolos: `422`, no lista vacía.
- [x] `isFavorite` es `true` solo para los productos marcados por el usuario autenticado, y otro usuario no los ve como favoritos.
- [x] `isFavorite` sale como booleano, no como `0` o `1`.
- [x] Sin token: `401 UNAUTHORIZED` en products y en categories, con el mismo mensaje que un token inválido o vencido.
- [x] `GET /api/categories` devuelve todas las categorías ordenadas, con `id`, `name` y `slug`, y sus slugs son los que acepta el filtro de products.

## 8. Criterios de aceptación

- [x] Paginación, filtro y búsqueda se ejecutan en SQL, no en memoria.
- [x] Ninguna entrada del usuario se concatena en el SQL.
- [x] El orden es estable entre páginas.
- [x] Cada producto trae su categoría como objeto y `isFavorite` del usuario autenticado.
- [ ] El mapper de producto es compartido con el módulo de favoritos. **Pendiente por diseño:** `modules/favorites` no existe todavía; llega con el commit `feat(rewards)`. Lo que se cumple hoy es la condición que lo hace posible: el mapper está en `products.mapper.ts`, exportado, y el tipo de fila `ProductRow` es lo que cualquier consulta de productos comparte.
- [x] Los errores de validación respetan el formato del contrato.
- [x] La búsqueda ignora mayúsculas y tildes: "camara", "CÁMARA" y "cámara" dan los mismos resultados.
- [x] El README documenta las limitaciones de la búsqueda (recorrido completo sin índice, `ñ` tratada como `n`), las del orden y las del filtro de categoría.

## 9. Fuera de alcance

- Ordenar por precio u otros criterios; filtros por rango de precio o disponibilidad.
- Paginación por cursor y búsqueda de texto completo (FTS5).
- Caché HTTP o en memoria.
- Administración de productos y categorías.
