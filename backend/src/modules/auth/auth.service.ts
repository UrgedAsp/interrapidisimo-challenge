import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../../shared/errors/AppError';
import { AuthRepository } from './auth.repository';

const repo = new AuthRepository();

export class AuthService {
  async login(email: string, password: string) {
    const user = repo.findByEmail(email);
    if (!user) throw AppError.unauthorized('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw AppError.unauthorized('Credenciales inválidas');

    const secret = process.env.JWT_SECRET ?? 'dev_secret';
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '1h';
    const token = jwt.sign({ sub: user.id }, secret, { expiresIn } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
      },
    };
  }
}
