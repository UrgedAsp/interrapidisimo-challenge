import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  // 10-backend-auth.md sección 4 pide mínimo 32: con 16 un secreto débil sigue
  // arrancando la app y el fallo se descubre tarde, cuando ya hay datos.
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET es obligatoria' })
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string({ error: 'JWT_EXPIRES_IN debe ser texto' }).default('1h'),
  // Costo de bcrypt. Las pruebas bajan este valor a 4 (el mínimo de la librería)
  // porque el costo 10 hace cada login del suite lento sin cambiar nada del
  // comportamiento que se está probando.
  BCRYPT_ROUNDS: z.coerce
    .number({ error: 'BCRYPT_ROUNDS debe ser un número' })
    .int('BCRYPT_ROUNDS debe ser un entero')
    .min(4, 'BCRYPT_ROUNDS debe ser 4 o más')
    .max(15, 'BCRYPT_ROUNDS debe ser 15 o menos')
    .default(10),
  DATABASE_PATH: z.string().default('./data/app.db'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Variables de entorno inválidas:\n${detail}\n\nRevisa backend/.env.example y copia el archivo a backend/.env`,
  );
}

export const env = parsed.data;