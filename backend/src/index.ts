import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, (error) => {
  if (error) {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }

  console.log(`API escuchando en http://localhost:${env.PORT}`);
});