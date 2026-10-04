import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CatalogFilters } from '../types/index.js';

export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get('category');
  const qParam = searchParams.get('q');
  const rawPageParam = searchParams.get('page');

  // Validar y sanitizar página
  const page = useMemo(() => {
    if (!rawPageParam) return 1;
    const parsed = Number(rawPageParam);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return 1;
    }
    return parsed;
  }, [rawPageParam]);

  // Si en la URL vino un valor de page inválido (ej. 'abc', '0', '-1', '1.5'), corregirlo con replace
  useEffect(() => {
    if (rawPageParam !== null) {
      const parsed = Number(rawPageParam);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('page');
            return next;
          },
          { replace: true },
        );
      }
    }
  }, [rawPageParam, setSearchParams]);

  const category = categoryParam ? categoryParam.trim() : undefined;
  const q = qParam ? qParam.trim() : undefined;

  const setCategory = useCallback(
    (slug: string | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (slug && slug.trim()) {
            next.set('category', slug.trim());
          } else {
            next.delete('category');
          }
          next.delete('page'); // Reset a página 1 (por defecto no aparece)
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setQuery = useCallback(
    (texto: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = texto.trim();
          if (trimmed) {
            next.set('q', trimmed);
          } else {
            next.delete('q');
          }
          next.delete('page'); // Reset a página 1
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (n: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (n > 1) {
            next.set('page', String(n));
          } else {
            next.delete('page');
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const filters: CatalogFilters = useMemo(
    () => ({
      category,
      q,
      page,
    }),
    [category, q, page],
  );

  return {
    ...filters,
    filters,
    setCategory,
    setQuery,
    setPage,
    clearFilters,
  };
}
