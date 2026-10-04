import React from 'react';
import { CategoryFilter } from './CategoryFilter.js';
import { SearchInput } from './SearchInput.js';

export interface CatalogFiltersProps {
  category?: string;
  q?: string;
  onSelectCategory: (category: string | undefined) => void;
  onSearch: (q: string) => void;
  className?: string;
}

export const CatalogFilters: React.FC<CatalogFiltersProps> = ({
  category,
  q,
  onSelectCategory,
  onSearch,
  className = '',
}) => {
  return (
    <div className={`flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between ${className}`}>
      <div className="flex-1 max-w-md">
        <SearchInput initialValue={q || ''} onSearch={onSearch} />
      </div>
      <div className="flex-1 md:flex-initial overflow-hidden">
        <CategoryFilter selectedCategory={category} onSelectCategory={onSelectCategory} />
      </div>
    </div>
  );
};
