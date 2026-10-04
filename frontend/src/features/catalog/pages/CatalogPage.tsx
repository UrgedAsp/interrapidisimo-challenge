import React from 'react';
import { Sparkles } from 'lucide-react';
import { CatalogFilters } from '../components/CatalogFilters.js';
import { Pagination } from '../components/Pagination.js';
import { ProductGrid } from '../components/ProductGrid.js';
import { useCatalogFilters } from '../hooks/useCatalogFilters.js';
import { useProducts } from '../hooks/useProducts.js';

export const CatalogPage: React.FC = () => {
  const { category, q, page, setCategory, setQuery, setPage, clearFilters, filters } =
    useCatalogFilters();

  const {
    data: productsResult,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    refetch,
  } = useProducts(filters, {
    onPageOutOfRange: (maxPage) => setPage(maxPage),
  });

  const products = productsResult?.data ?? [];
  const meta = productsResult?.meta;
  const total = meta?.total;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-8">
      {/* Banner / Hero editorial */}
      <section
        aria-labelledby="rewards-banner-heading"
        className="bg-tertiary/10 border border-tertiary/20 rounded-[var(--radius-card)] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary mb-1">
            <Sparkles size={14} aria-hidden="true" />
            <span>Programa de Recompensas</span>
          </div>
          <h2
            id="rewards-banner-heading"
            className="text-2xl sm:text-3xl font-bold text-primary font-headline tracking-tight"
          >
            Compra y acumula puntos
          </h2>
          <p className="text-primary/70 text-xs sm:text-sm mt-1 max-w-xl">
            Gana 2 puntos al marcar tus favoritos y acumula 1 punto por cada $1.000 COP + 5 puntos por cada producto comprado en tu checkout.
          </p>
        </div>
      </section>

      {/* Filtros de Búsqueda y Categorías */}
      <CatalogFilters
        category={category}
        q={q}
        onSelectCategory={setCategory}
        onSearch={setQuery}
      />

      {/* Cuadrícula de Productos */}
      <ProductGrid
        products={products}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        isError={isError}
        error={error}
        filters={filters}
        onRetry={() => refetch()}
        onClearFilters={clearFilters}
      />

      {/* Paginación */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
