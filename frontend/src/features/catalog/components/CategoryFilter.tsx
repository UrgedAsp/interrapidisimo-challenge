import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { useCategories } from '../hooks/useCategories.js';

export interface CategoryFilterProps {
  selectedCategory?: string;
  onSelectCategory: (slug: string | undefined) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  className = '',
}) => {
  const { data: categories = [], isLoading, isError, refetch } = useCategories();

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 overflow-x-auto py-1 scrollbar-none ${className}`}>
        <Skeleton className="h-8 w-16 rounded-full shrink-0" />
        <Skeleton className="h-8 w-24 rounded-full shrink-0" />
        <Skeleton className="h-8 w-20 rounded-full shrink-0" />
        <Skeleton className="h-8 w-28 rounded-full shrink-0" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex items-center gap-2 text-xs text-error ${className}`}>
        <span>No se pudieron cargar las categorías.</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="underline font-semibold hover:text-error/80 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Filtro por categoría"
      className={`flex items-center gap-2 overflow-x-auto py-1 scrollbar-none ${className}`}
    >
      <button
        type="button"
        aria-pressed={!selectedCategory}
        onClick={() => onSelectCategory(undefined)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer min-h-[36px] flex items-center ${
          !selectedCategory
            ? 'bg-primary text-neutral'
            : 'bg-tertiary/15 text-primary hover:bg-tertiary/25'
        }`}
      >
        Todas
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectCategory(cat.slug)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer min-h-[36px] flex items-center ${
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
  );
};
