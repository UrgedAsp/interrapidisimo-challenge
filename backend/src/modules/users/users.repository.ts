import type { DatabaseConnection } from '../../db/database.js';

/**
 * Fila de `users` tal como la devuelve SQLite. `snake_case` y sin transformar:
 * el mapeo a `User` (camelCase del contrato, §3) es del service, no de aquí.
 */
export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  points_balance: number;
};

const SELECT_USER = 'SELECT id, email, name, password_hash, points_balance FROM users';

/**
 * Acceso a la tabla `users` (§3 de `10-backend-auth.md`). Vive en su propio módulo
 * y no dentro de auth porque el carrito y los favoritos también van a necesitar
 * leer usuarios; si el repository fuera de auth, esos módulos dependerían de él
 * para algo que no es autenticación.
 */
export function createUsersRepository(db: DatabaseConnection) {
  return {
    /**
     * `users.email` está declarado `COLLATE NOCASE`, así que la comparación ya
     * ignora mayúsculas sin necesidad de `lower()` en el SQL: el índice único
     * también impide dos cuentas que solo difieran en mayúsculas.
     */
    findByEmail(email: string): UserRow | undefined {
      return db.prepare(`${SELECT_USER} WHERE email = ?`).get(email) as UserRow | undefined;
    },

    findById(id: number): UserRow | undefined {
      return db.prepare(`${SELECT_USER} WHERE id = ?`).get(id) as UserRow | undefined;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
