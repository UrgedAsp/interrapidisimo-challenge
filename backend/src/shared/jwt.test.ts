import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { signToken, verifyToken } from './jwt.js';

const firmar = (payload: object, options: jwt.SignOptions = {}) =>
  jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });

describe('signToken / verifyToken (sección 5)', () => {
  it('round-trip conserva el id', () => {
    expect(verifyToken(signToken(7))).toEqual({ id: 7 });
  });

  it('el payload lleva solo sub: ni correo, ni puntos, ni nombre', () => {
    const payload = jwt.decode(signToken(7)) as Record<string, unknown>;

    // `iat` y `exp` los agrega la librería. Lo que no debe aparecer es nada
    // que identifique a la persona o su saldo.
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe('7');
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = jwt.sign({ sub: '1' }, 'secreto-del-atacante', { algorithm: 'HS256' });

    expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
  });

  it('rechaza un token expirado', () => {
    expect(() => verifyToken(firmar({ sub: '1' }, { expiresIn: '-1s' }))).toThrow(
      jwt.TokenExpiredError,
    );
  });

  it('rechaza "alg: none"', () => {
    const token = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: '1' }),
    ).toString('base64url')}.`;

    expect(() => verifyToken(token)).toThrow();
  });

  it('fuerza HS256 y no acepta otros algoritmos', () => {
    expect(() => verifyToken(firmar({ sub: '1' }, { algorithm: 'HS384' }))).toThrow(
      jwt.JsonWebTokenError,
    );
  });

  it.each([
    ['sin sub', {}],
    ['con sub no numérico', { sub: 'abc' }],
    ['con sub cero', { sub: '0' }],
    ['con sub negativo', { sub: '-5' }],
  ])('rechaza un token %s', (_caso, payload) => {
    expect(() => verifyToken(firmar(payload))).toThrow(jwt.JsonWebTokenError);
  });
});
