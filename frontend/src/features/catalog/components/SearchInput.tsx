import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce.js';

export interface SearchInputProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  initialValue = '',
  onSearch,
  className = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, 300);
  const lastEmittedRef = useRef<string>(initialValue);

  // Sincronizar con cambios externos en initialValue (ej. volver atrás, limpiar filtros)
  useEffect(() => {
    if (initialValue !== lastEmittedRef.current) {
      setValue(initialValue);
      lastEmittedRef.current = initialValue;
    }
  }, [initialValue]);

  // Emitir cuando el valor debounced cambia
  useEffect(() => {
    if (debouncedValue !== lastEmittedRef.current) {
      lastEmittedRef.current = debouncedValue;
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lastEmittedRef.current = value;
      onSearch(value);
    }
  };

  const handleClear = () => {
    setValue('');
    lastEmittedRef.current = '';
    onSearch('');
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        lastEmittedRef.current = value;
        onSearch(value);
      }}
      className={`relative w-full ${className}`}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Buscar productos
      </label>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
        <Search size={18} aria-hidden="true" />
      </div>
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar por nombre"
        maxLength={100}
        aria-label="Buscar productos"
        className="w-full pl-10 pr-10 py-2.5 bg-neutral border border-tertiary/40 rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Borrar búsqueda"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary/40 hover:text-primary transition-colors cursor-pointer"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </form>
  );
};
