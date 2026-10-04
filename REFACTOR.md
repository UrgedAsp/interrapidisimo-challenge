# Diagnóstico y Refactorización de `ProductCatalog` (Ejercicio 2)

## 1. Lista de problemas detectados (Ordenados por impacto)

### 🔴 Nivel 1: Críticos (Bugs fatales, render loops y corrupción de estado)
1. **Fetch en el cuerpo de la función (Render Loop / Bucle Infinito):**
   - **Problema:** La llamada a `fetch(...)` se ejecuta directamente en el cuerpo del componente en cada ciclo de render. Al completar la promesa se ejecuta `setProducts(data)`, lo que provoca un re-render inmediato y dispara otro `fetch`, creando un bucle infinito que satura la red, degrada el navegador y bloquea la aplicación.
   - **Impacto:** Caída de rendimiento total y posible baneo por denegación de servicio (DoS) involuntario al backend.

2. **Mutación directa del estado de React (`cart.push`):**
   - **Problema:** Se hace `cart.push(product)` y luego `setCart(cart)`.
   - **Impacto:** Viola la inmutabilidad de React. Al pasar la misma referencia de memoria (`Object.is(cart, cart) === true`), React puede ignorar la actualización del Virtual DOM, haciendo que el contador de ítems y la UI queden desincronizados de forma no determinista.

3. **Pérdida destructiva de datos en la búsqueda (`handleSearch`):**
   - **Problema:** La función filtra el arreglo `products` y sobreescribe el estado con `setProducts(filtered)`.
   - **Impacto:** Destrucción irrevocable de la lista base. Al borrar o cambiar el término de búsqueda, los productos originales ya no existen en memoria y la búsqueda deja de funcionar a menos que se fuerce una recarga completa de red.

### 🟠 Nivel 2: Alto (Seguridad, negocio y concurrencia)
4. **Cálculo de puntos y lógica de negocio en el cliente + ID quemado (`/users/1/points`):**
   - **Problema:** El cliente calcula `points + 10` y lo envía en el body a un endpoint con ID de usuario hardcodeado (`/users/1/`).
   - **Impacto:** Vulnerabilidad crítica de seguridad (manipulación de datos). Los puntos deben ser calculados y otorgados exclusivamente por el servidor mediante una transacción autorizada. Además, el `userId` debe derivarse del token JWT verificado en el backend, jamás exponerse en la URL de forma fija.

5. **Condición de carrera (Race Condition) y falta de cancelación de peticiones:**
   - **Problema:** Si `props.category` cambia rápidamente, múltiples peticiones quedan en vuelo. Una respuesta lenta de una categoría previa puede resolver después y sobreescribir la categoría actual.
   - **Impacto:** Inconsistencia visual de datos donde se muestran productos que no corresponden a la categoría seleccionada.

6. **Variable global mutable fuera del componente (`let cachedProducts = []`):**
   - **Problema:** Variable en el scope del módulo.
   - **Impacto:** Fuga de memoria y contaminación cruzada: si se montan múltiples instancias del componente, ambas pisarán la misma variable. En SSR provocaría fuga de datos entre sesiones de usuarios.

### 🟡 Nivel 3: Medio (Rendimiento, UX y buenas prácticas de React)
7. **Falta de prop `key` única en listas renderizadas:**
   - **Problema:** `products.map(p => <div>...)` no tiene `key={p.id}`.
   - **Impacto:** Advertencia de React y reconciliación ineficiente del Virtual DOM al insertar o reordenar elementos.

8. **Falta de estados de carga (`loading`), error y vacío (`empty`):**
   - **Problema:** No hay feedback visual mientras se descargan los productos ni captura de errores con `.catch()`. Si el API falla, el usuario ve una pantalla en blanco sin explicación.

9. **Falta de `Content-Type: application/json` y autenticación en la petición `POST`:**
   - **Problema:** El `fetch` envía un JSON como string sin cabecera `Content-Type`.

### 🟢 Nivel 4: Bajo (Mantenibilidad, Clean Code y Accesibilidad)
10. **URLs hardcodeadas en el código:**
    - **Problema:** `https://api.tienda.com/...` quemada en código en lugar de utilizar variables de entorno (`VITE_API_URL` o `process.env`) o un cliente API centralizado.
11. **Uso de `var`, bucles imperativos y búsqueda estricta (`indexOf`):**
    - **Problema:** Código JavaScript legado con `var` (alcance de función y hoisting). `indexOf` no ignora mayúsculas ni normaliza tildes.
12. **Mala accesibilidad (a11y):**
    - **Problema:** Se usa un `<div onClick>` en vez de un `<button>` semántico, las imágenes no tienen `alt`, y el input de búsqueda carece de `<label>`.

---

## 2. Refactorización propuesta

A continuación se presenta la solución refactorizada abordando los problemas más críticos (Nivel 1, 2 y 3). 

Se utiliza **React moderno con hooks** (`useEffect`, `useMemo`, `useState`), **`AbortController`** para evitar condiciones de carrera, **inmutabilidad de estado**, separación de la lista original y filtrada, y manejo de estados de carga y error:

```tsx
import React, { useState, useEffect, useMemo } from 'react';

// 1. URL base desde variable de entorno o cliente HTTP centralizado
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tienda.com';

export function ProductCatalog({ category, onAddToCart }) {
  // Estado local para datos del servidor
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para la búsqueda en cliente (no muta la lista original)
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Carga de datos dentro de useEffect con AbortController (evita render loop y race conditions)
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const endpoint = category
      ? `${API_BASE_URL}/products?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/products`;

    fetch(endpoint, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error al cargar productos (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : data.data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        // Ignoramos la cancelación intencional por cambio de dependencia
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error de conexión');
          setIsLoading(false);
        }
      });

    // Cleanup: cancela la petición pendiente si category cambia o el componente se desmonta
    return () => controller.abort();
  }, [category]);

  // 3. Filtrado declarativo memoizado: no destructivo y resistente a mayúsculas/minúsculas
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      product.name?.toLowerCase().includes(query)
    );
  }, [products, searchTerm]);

  return (
    <section className="catalog-container" aria-label="Catálogo de productos">
      {/* Buscador accesible */}
      <div className="search-bar">
        <label htmlFor="catalog-search" className="sr-only">
          Buscar productos
        </label>
        <input
          id="catalog-search"
          type="search"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Estados de carga y error explícitos */}
      {isLoading && <p role="status">Cargando catálogo...</p>}

      {error && (
        <div role="alert" className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Cuadrícula de productos */}
      {!isLoading && !error && filteredProducts.length === 0 && (
        <p>No se encontraron productos disponibles.</p>
      )}

      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article key={product.id} className="product-card">
              <img
                src={product.image || '/placeholder.png'}
                alt={product.name}
                loading="lazy"
              />
              <h3>{product.name}</h3>
              <p>${product.price?.toLocaleString('es-CO')}</p>
              
              {/* Botón semántico accesible para agregar al carrito */}
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                aria-label={`Agregar ${product.name} al carrito`}
              >
                Agregar al carrito
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

### ¿Por qué se modificó la acción de `addToCart` y `points`?
En el componente original, `ProductCatalog` intentaba mutar el carrito global, calcular los puntos (`points + 10`) y llamar a una ruta insegura (`/users/1/points`).
En la versión refactorizada:
1. `ProductCatalog` delega la acción de compra a través del prop `onAddToCart(product)` (o un custom hook `useCart()`), cumpliendo con el **Principio de Responsabilidad Única (SRP)**.
2. El cálculo de puntos y la persistencia de la orden/carrito ocurren en el **servidor**, donde una API protegida (`POST /api/cart/items`) procesa la solicitud mediante el JWT de la sesión autenticada.

---

## 3. Aspectos para una segunda iteración (Deuda Técnica y Mejoras)

Si se dispusiera de más tiempo, las siguientes mejoras se implementarían en este orden de prioridad:

1. **Migración a TanStack Query (`@tanstack/react-query`):**
   - Sustituir `fetch` manual y `useEffect` por `useQuery(['products', category], ...)`. Proporciona almacenamiento en caché inteligente, reintentos automáticos, deduplicación de peticiones y sincronización en segundo plano de forma declarativa.
2. **Debounce y normalización avanzada de texto:**
   - Implementar un hook `useDebounce` para diferir el filtrado en colecciones grandes, y normalización NFD (eliminar tildes/diacríticos como `"camara" -> "cámara"`).
3. **Paginación en servidor y URL SearchParams:**
   - Mover la búsqueda y el filtro de categorías a parámetros de la URL (`?category=x&search=y&page=1`) para permitir compartir enlaces y soportar catálogos grandes que no puedan cargarse completos en memoria.
4. **Descomposición en componentes atómicos:**
   - Extraer `ProductCard`, `SearchBar`, `ProductGridSkeleton` y `EmptyState` en módulos independientes reutilizables.
5. **Pruebas unitarias de regresión:**
   - Crear suite con Vitest y `@testing-library/react` para verificar la cancelación de peticiones, el renderizado de productos y la respuesta a eventos de búsqueda.
