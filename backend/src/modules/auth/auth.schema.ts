import { z } from 'zod';

/**
 * `POST /api/auth/login` (§5 de `10-backend-auth.md`).
 *
 * El correo se recorta y pasa a minúsculas antes de validarse: el login no pide
 * reglas de complejidad, solo que el campo sea un correo, y un espacio pegado al
 * pegar el texto no debería convertirse en "correo no válido".
 *
 * El tope de 128 caracteres evita que alguien mande un cuerpo enorme para que el
 * servidor gaste tiempo en hashearlo. No es una regla de contraseña porque aquí
 * solo se compara, nunca se establece.
 */
export const loginBody = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email('Ingresa un correo válido')),
  password: z.string().min(1, 'La contraseña es obligatoria').max(128, 'Máximo 128 caracteres'),
});
