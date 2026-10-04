# AGENTS.md

Convenciones del repo. Leer antes de tocar código.

## Idioma

- **Documentación, UI y specs en español**: `README.md`, `AGENTS.md`, `specs/**`, textos visibles, mensajes de error, comentarios.
- **Identificadores de código en inglés**: nombres de variables, funciones, clases, módulos, rutas de archivo, ramas de git.
- Los tipos, campos de la base de datos y códigos de error del contrato van en inglés pero sus valores visibles van en español.

## Specs

`specs/` es la fuente de verdad. El trabajo se implementa spec por spec, en el orden del índice de `specs/00-overview.md` sección 10, respetando el plan de commits de sección 9.

- No se implementa nada que no esté en una spec.
- Si una spec y el código discrepan, la spec gana.
- Si al implementar una spec surge una decisión que la spec no cubre, se documenta en el README (supuestos o recortes) en vez de inventar comportamiento silenciosamente.

## Backend

- Organización **por módulo**, y dentro de cada módulo por capas: `routes → controller → service → repository`.
- **Solo los repositorios escriben SQL.** Cambiar de base de datos debe afectar únicamente esa capa.
- La lógica de negocio (reglas de puntos, stock, totales) vive **solo en el servidor**.
- El `userId` siempre sale del token verificado. Nunca del body, ni de la query, ni de la URL.
- Toda respuesta del API usa el contrato de `00-overview.md` sección 5: `{ data }`, `{ data, meta }` o `{ error: { code, message, details } }`. Sin excepciones.
- Errores de negocio como `AppError`, nunca `throw new Error()` suelto desde un service.

## Frontend

- Datos en cliente con **TanStack Query**. Nada de estado remoto en `useState`.
- El cliente nunca calcula puntos ni precios: los recibe del servidor.
- El token vive en `localStorage` (riesgo de XSS documentado en `00-overview.md` sección 7).
- Tipos duplicados a mano entre `backend/` y `frontend/`. No hay paquete de tipos compartido (recorte documentado).

## Estilos

- Los tokens de diseño viven **únicamente** en el bloque `@theme` de `frontend/src/index.css`. Ese es el único archivo donde se permiten valores hex.
- En componentes solo se usan utilidades Tailwind derivadas de tokens: `bg-primary`, `text-secondary`, `border-tertiary`, `rounded-card`, `font-headline`, etc.
- Nada de hex sueltos, `rgb()` o nombres de color literales en JSX o clases.
- Mobile-first: estilos base para móvil, `sm:` / `md:` / `lg:` para ampliar.
- Iconos de `lucide-react`. El `LucideProvider` en `frontend/src/main.tsx` ya fija trazo 1.5 y tamaño 20 px, no reescribir esos props.

## Verificación

Antes de dar por terminado cualquier commit:

```bash
npm run typecheck
npm run build
npm run test
```

Si algo no compila o falla, se arregla en el mismo commit. No se commitea código roto.

## Commits

- Un commit por unidad funcional, siguiendo el plan de `00-overview.md` sección 9.
- Mensajes en inglés, tipo convencional de Angular: `feat(api):`, `chore:`, `docs:`.
- El cuerpo del commit explica el porqué cuando la decisión no es obvia.