import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { signToken, verifyToken } from './jwt.js';

const bearer = (payload: object, secret = env.JWT_SECRET) =>
  jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });

describe('signToken / verifyToken', () => {
  it('round-trip conserva el id y el correo', () => {
    const payload = verifyToken(signToken({ id: 7, email: 'ana@tienda.co' }));

    expect(payload).toEqual({ sub: 7, email: 'ana@tienda.co' });
  });

  it('rechaza un token firmado con otro secreto', () => {
    const token = bearer({ sub: '1', email: 'ana@tienda.co' }, 'secreto-del-atacante');

    expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
  });

  it('rechaza un token expirado', () => {
    const token = jwt.sign({ email: 'ana@tienda.co' }, env.JWT_SECRET, {
      subject: '1',
      expiresIn: '-1s',
    });

    expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
  });

  it('rechaza "alg: none"', () => {
    const token = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(
      JSON.stringify({ sub: '1', email: 'ana@tienda.co' }),
    ).toString('base64url')}.`;

    expect(() => verifyToken(token)).toThrow();
  });

  it('fuerza HS256 y no acepta otros algoritmos', () => {
    const token = jwt.sign({ email: 'ana@tienda.co' }, env.JWT_SECRET, {
      subject: '1',
      algorithm: 'HS384',
    });

    expect(() => verifyToken(token)).toThrow(jwt.JsonWebTokenError);
  });

  it.each([
    ['sin sub', {}],
    ['con sub no numérico', { sub: 'abc' }],
    ['con sub cero', { sub: '0' }],
    ['con sub negativo', { sub: '-5' }],
  ])('rechaza un token %s', (_caso, payload) => {
    expect(() => verifyToken(bearer(payload))).toThrow(jwt.JsonWebTokenError);
  });

  it('acepta un token sin correo, porque el id es lo obligatorio', () => {
    expect(verifyToken(bearer({ sub: '9' }))).toEqual({ sub: 9, email: '' });
  });
});
