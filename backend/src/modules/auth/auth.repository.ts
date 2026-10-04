import db from '../../db/database';

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  points: number;
}

export class AuthRepository {
  findByEmail(email: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  }

  findById(id: number): Omit<UserRow, 'password'> | undefined {
    return db
      .prepare('SELECT id, email, name, points FROM users WHERE id = ?')
      .get(id) as Omit<UserRow, 'password'> | undefined;
  }
}
