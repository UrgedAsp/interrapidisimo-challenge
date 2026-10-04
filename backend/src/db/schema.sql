-- Esquema de la base de datos — specs/01-data-model.md
--
-- Los invariantes de §5 se implementan como restricciones del motor, no como
-- validaciones en TypeScript: los estados inválidos son imposibles de escribir.
--
-- No hay sistema de migraciones (recorte documentado en §8). Este archivo se
-- aplica al abrir la base y solo crea lo que falta.

PRAGMA foreign_keys = ON;

-- Defaults de fecha. 01-data-model.md §2 exige ISO 8601 en UTC, pero el
-- CURRENT_TIMESTAMP de SQLite escribe 'YYYY-MM-DD HH:MM:SS': sin la T, sin
-- milisegundos y sin zona. new Date() interpreta ese texto como hora LOCAL,
-- así que un '2026-10-04 17:57:22' en una máquina en UTC-5 se leía cinco
-- horas tarde. strftime sí produce ISO 8601 real y new Date() lo parsea
-- como UTC. Ordenar por texto sigue equivaliendo a ordenar por fecha.

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  points_balance  INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  price        INTEGER NOT NULL CHECK (price > 0),
  category_id  INTEGER NOT NULL REFERENCES categories (id),
  image_url    TEXT    NOT NULL,
  stock        INTEGER NOT NULL CHECK (stock >= 0),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- El filtro por categoría y la búsqueda por nombre se resuelven aquí.
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- COLLATE NOCASE para que la búsqueda no dependa de cómo se escribió el nombre.
-- La búsqueda de §5 es sobre el texto normalizado con normalize_text(), no sobre
-- la columna, así que este índice no la acelera: con ~40 productos es irrelevante.
-- El índice sí sirve para el orden alfabético de §5, que es lo que lo justifica.
-- FTS5 queda para una segunda iteración (§4 y §8).
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS carts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  status      TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'checked_out')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Invariante 2: un usuario tiene como máximo un carrito abierto. El índice es
-- parcial, así que los carritos ya cobrados no bloquean al usuario.
CREATE UNIQUE INDEX IF NOT EXISTS one_open_cart_per_user
  ON carts (user_id)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id     INTEGER NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products (id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     INTEGER NOT NULL REFERENCES users (id),
  product_id  INTEGER NOT NULL REFERENCES products (id),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  -- Invariante: un carrito solo puede convertirse en una orden, lo que hace el
  -- checkout idempotente.
  cart_id     INTEGER NOT NULL UNIQUE REFERENCES carts (id),
  total       INTEGER NOT NULL CHECK (total > 0),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Invariante 4: unit_price congela el precio al momento de la compra, así que
-- cambiar el precio del producto no altera órdenes ya emitidas.
CREATE TABLE IF NOT EXISTS order_items (
  order_id    INTEGER NOT NULL REFERENCES orders (id),
  product_id  INTEGER NOT NULL REFERENCES products (id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

-- Invariante 1: estas filas son la fuente de verdad del saldo. La restricción
-- UNIQUE es el mecanismo anti-abuso: la base rechaza cualquier premio repetido.
CREATE TABLE IF NOT EXISTS points_ledger (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  action      TEXT    NOT NULL CHECK (action IN ('FAVORITE', 'PURCHASE')),
  reference   TEXT    NOT NULL,
  points      INTEGER NOT NULL CHECK (points > 0),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, action, reference)
);

-- Invariante 5: quitar un favorito o vaciar el carrito nunca borra filas del
-- ledger, así que ON DELETE CASCADE aparece solo donde no rompería el saldo.
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items (cart_id);