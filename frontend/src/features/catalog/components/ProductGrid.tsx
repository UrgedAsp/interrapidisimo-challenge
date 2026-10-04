import React from 'react';
import { Button } from '../../../components/ui/Button.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import type { Product } from '../../../types/api.js';
import { CATALOG_PAGE_SIZE } from '../hooks/useProducts.js';
import type { CatalogFilters } from '../types/index.js';
import { ProductCard } from './ProductCard.js';
import { ProductCardSkeleton } from './ProductCardSkeleton.js';

export interface ProductGridProps {
  products: Product[];
  total?: number;
  isLoading: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  isError: boolean;
  error?: unknown;
  filters: CatalogFilters;
  onRetry: () => void;
  onClearFilters: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  total,
  isLoading,
  isFetching = false,
  isPlaceholderData = false,
  isError,
  error,
  filters,
  onRetry,
  onClearFilters,
}) => {
  const hasActiveFilters = Boolean(filters.category || filters.q);

  return (
    <section aria-labelledby="catalog-heading" className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-tertiary/15 pb-4">
        <h1 id="catalog-heading" tabIndex={-1} className="text-2xl sm:text-3xl font-bold text-primary font-headline tracking-tight focus:outline-none">
          Catálogo
        </h1>
        {total !== undefined && !isLoading && !isError && (
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-xs sm:text-sm font-medium text-primary/60"
          >
            {total} {total === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: CATALOG_PAGE_SIZE }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : products.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No encontramos productos"
            description={
              filters.q && filters.category
                ? `No hay resultados para "${filters.q}" en la categoría seleccionada.`
                : filters.q
                ? `No hay resultados para "${filters.q}".`
                : 'No hay productos disponibles en esta categoría.'
            }
            action={
              <Button variant="outline" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Aún no hay productos disponibles"
            description="Vuelve más tarde para descubrir nuestro catálogo de productos."
          />
        )
      ) : (
        <div
          aria-busy={isFetching || isPlaceholderData}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-200 ${
            isFetching || isPlaceholderData ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
