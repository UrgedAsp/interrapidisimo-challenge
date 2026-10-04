/**
 * Normalización de texto para búsquedas.
 *
 * La misma función corre en dos lados: aquí, sobre lo que escribió el usuario, y
 * en SQL como `normalize_text` (registrada en `db/connection.ts`). Las dos deben
 * producir exactamente el mismo resultado; si difieren, la búsqueda falla de forma
 * silenciosa: "camara" encontraría "Camara" pero no "Cámara".
 *
 * NFD separa la tilde de la letra, así que quitarla es comparar por rango sobre
 * los caracteres ya descompuestos. Quitar la tilde sin descomponer antes dejaría
 * caracteres combinados sueltos.
 *
 * El efecto colateral del NFD es que la `ñ` se vuelve `n`: buscar "nino" encuentra
 * "Niño". Es lo habitual en buscadores en español y así lo documenta
 * `10-backend-products.md` sección 6.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
