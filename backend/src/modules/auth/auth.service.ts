import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import type { DatabaseConnection } from '../../db/database.js';
import { invalidCredentials, unauthorized } from '../../shared/errors.js';
import { signToken } from '../../shared/jwt.js';
import type { LoginResult, User } from '../../shared/types.js';
import { createUsersRepository, type UserRow } from '../users/users.repository.js';

/**
 * Hash de una contraseña que no corresponde a ninguna cuenta, contra el que se
 * compara cuando el correo no existe. Se genera una sola vez y se memoriza.
 *
 * Tiene que llevar el mismo `BCRYPT_ROUNDS` que las contraseñas reales: bcrypt
 * toma el costo del propio hash, así que un hash ficticio más barato haría que
 * el correo inexistente respondiera más rápido que el usuario real, que es
 * exactamente el canal lateral que esto cierra.
 */
let dummyPasswordHash: string | undefined;

function getDummyPasswordHash(): string {
  dummyPasswordHash ??= bcrypt.hashSync(randomBytes(32).toString('base64'), env.BCRYPT_ROUNDS);

  return dummyPasswordHash;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    pointsBalance: row.points_balance,
  };
}

export function createAuthService(db: DatabaseConnection) {
  const users = createUsersRepository(db);

  return {
    async login(credentials: { email: string; password: string }): Promise<LoginResult> {
      const row = users.findByEmail(credentials.email);

      // Siempre se compara, haya usuario o no: si se devolviera el error sin
      // comparar, el tiempo de respuesta bastaría para enumerar los correos
      // registrados en la tienda.
      const passwordMatches = await bcrypt.compare(
        credentials.password,
        row?.password_hash ?? getDummyPasswordHash(),
      );

      if (!row || !passwordMatches) {
        throw invalidCredentials();
      }

      return {
        token: signToken(row.id),
        user: toUser(row),
      };
    },

    /**
     * `GET /api/me`. Lee el usuario de la base en vez de fiarse solo del token
     * porque el saldo de puntos cambia con cada acción que premia y §5 de
     * `03-rewards.md` dice que el saldo inicial del frontend sale de aquí.
     *
     * El token solo se verifica por firma y no consulta la base, así que un
     * token de un usuario que ya no existe llega hasta aquí. Responde 401 como si
     * el token fuera inválido: lo único que el cliente puede hacer es
     * reautenticarse.
     */
    me(userId: number): User {
      const row = users.findById(userId);

      if (!row) {
        throw unauthorized();
      }

      return toUser(row);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
