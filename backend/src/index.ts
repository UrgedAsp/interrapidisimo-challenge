import { createApp } from './app.js';
import { env } from './config/env.js';
import { openDatabaseWithSchema } from './db/connection.js';

// El esquema se aplica al abrir porque no hay sistema de migraciones
// (`01-data-model.md` §2). Todas las sentencias son `IF NOT EXISTS`, así que
// levantar el servidor dos veces no cambia nada.
const db = openDatabaseWithSchema(env.DATABASE_PATH);

const app = createApp(db);

app.listen(env.PORT, (error) => {
  if (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }

  console.log(`API escuchando en http://localhost:${env.PORT}`);
});
