import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // El backend valida el entorno con Zod al importar, así que los tests
    // declaran sus propias variables y no dependen de un `.env` local.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-solo-para-pruebas-no-usar-en-produccion',
      DATABASE_PATH: ':memory:',
    },
  },
});
