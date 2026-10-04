// Copia a dist/ los assets que el código lee en runtime. `tsc` solo emite .js,
// así que sin esto `node dist/index.js` no encontraría ni el esquema ni el seed.
// cpSync crea los directorios destino si no existen.
import { cpSync } from 'node:fs';

const ASSETS = [
  ['src/db/schema.sql', 'dist/db/schema.sql'],
  ['src/db/seed-data', 'dist/db/seed-data'],
];

for (const [from, to] of ASSETS) {
  cpSync(from, to, { recursive: true });
  console.log(`copiado ${from} -> ${to}`);
}