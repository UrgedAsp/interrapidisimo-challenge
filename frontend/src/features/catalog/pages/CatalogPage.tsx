import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Heart, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import { ProductImage } from '../../../components/ui/ProductImage.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { useDebounce } from '../../../hooks/useDebounce.js';
import { formatCOP } from '../../../lib/format.js';
import { useCart } from '../../cart/hooks/useCart.js';
import { useFavorites } from '../../favorites/hooks/useFavorites.js';
import { getCategoriesApi, getProductsApi } from '../api/catalogApi.js';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros derivados de la URL
  const categoryParam = searchParams.get('category') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const qParam = searchParams.get('q') || '';

  // Estado local para el input de búsqueda
  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Hooks de negocio
  const { addItem, isAdding } = useCart();
  const { addFavorite, removeFavorite } = useFavorites();

  // Sincronizar debounce con searchParams
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch.trim()) {
        next.set('q', debouncedSearch.trim());
      } else {
        next.delete('q');
      }
      next.set('page', '1'); // Reset de página al buscar
      return next;
    });
  }, [debouncedSearch, setSearchParams]);

  // Consulta de categorías
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategoriesApi,
    staleTime: 5 * 60 * 1000,
  });

  // Consulta de productos
  const {
    data: productsResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', { category: categoryParam, q: qParam, page: pageParam }],
    queryFn: () =>
      getProductsApi({
        category: categoryParam || undefined,
        q: qParam || undefined,
        page: pageParam,
        pageSize: 12,
      }),
  });

  const products = productsResult?.data ?? [];
  const meta = productsResult?.meta;

  const handleCategoryChange = (slug: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) {
        next.set('category', slug);
      } else {
        next.delete('category');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (productId: number, isFavorite: boolean) => {
    if (isFavorite) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner / Hero editorial */}
      <div className="bg-tertiary/10 border border-tertiary/20 rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            <Sparkles size={14} aria-hidden="true" />
            <span>Programa de Recompensas</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary font-headline tracking-tight">
            Catálogo Exclusivo
          </h1>
          <p className="text-primary/70 text-sm sm:text-base mt-1 max-w-xl">
            Gana 2 puntos al marcar tus favoritos y acumula 1 punto por cada $1.000 COP + 5 puntos por cada producto comprado.
          </p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
            <Search size={18} aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre (ej. jamón, mesa, reloj)..."
            aria-label="Buscar productos por nombre"
            className="w-full pl-10 pr-4 py-2 bg-neutral border border-tertiary/40 rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:border-secondary focus:ring-1 focus:ring-secondary text-sm"
          />
        </div>

        {/* Categorías Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!categoryParam}
            onClick={() => handleCategoryChange('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              !categoryParam
                ? 'bg-primary text-neutral'
                : 'bg-tertiary/15 text-primary hover:bg-tertiary/25'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => {
            const isSelected = categoryParam === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-neutral'
                    : 'bg-tertiary/15 text-primary hover:bg-tertiary/25'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Productos */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-tertiary/20 rounded-[var(--radius-card)] p-4 space-y-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No encontramos productos"
          description={
            qParam || categoryParam
              ? 'Intenta ajustar los filtros de búsqueda o seleccionar otra categoría.'
              : 'No hay productos disponibles en este momento.'
          }
          action={
            qParam || categoryParam ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setSearchParams(new URLSearchParams());
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col justify-between bg-neutral border border-tertiary/20 rounded-[var(--radius-card)] p-4 hover:border-tertiary/60 transition-all duration-200"
            >
              <div>
                <div className="relative mb-3">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                  <button
                    type="button"
                    onClick={() => toggleFavorite(product.id, product.isFavorite)}
                    aria-label={
                      product.isFavorite
                        ? `Quitar ${product.name} de favoritos`
                        : `Marcar ${product.name} como favorito`
                    }
                    className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer focus-visible:outline-secondary ${
                      product.isFavorite
                        ? 'bg-neutral/90 text-secondary'
                        : 'bg-neutral/70 text-primary/40 hover:text-secondary'
                    }`}
                  >
                    <Heart
                      size={18}
                      fill={product.isFavorite ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                    {product.category.name}
                  </span>
                  <h3 className="font-medium text-primary line-clamp-2 text-sm leading-snug">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-between pt-1">
                    <p className="text-base font-bold text-primary font-headline">
                      {formatCOP(product.price)}
                    </p>
                    <span className="text-[11px] text-primary/50">
                      {product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-tertiary/10">
                <Button
                  variant="primary"
                  fullWidth
                  size="sm"
                  disabled={product.stock === 0 || isAdding}
                  onClick={() => addItem({ productId: product.id, quantity: 1 })}
                  className="gap-2 text-xs"
                >
                  <ShoppingBag size={14} aria-hidden="true" />
                  {product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {meta && meta.totalPages > 1 && (
        <nav
          className="flex items-center justify-between border-t border-tertiary/20 pt-6 mt-8"
          aria-label="Paginación del catálogo"
        >
          <div className="text-xs text-primary/60">
            Página <strong className="text-primary">{meta.page}</strong> de{' '}
            <strong className="text-primary">{meta.totalPages}</strong> ({meta.total} productos)
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handlePageChange(meta.page - 1)}
              aria-label="Página anterior"
              className="gap-1"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => handlePageChange(meta.page + 1)}
              aria-label="Página siguiente"
              className="gap-1"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
};
