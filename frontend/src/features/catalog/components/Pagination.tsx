import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
    // Desplazamiento suave al inicio de la cuadrícula
    const heading = document.getElementById('catalog-heading');
    if (heading) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      heading.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      heading.focus({ preventScroll: true });
    }
  };

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <nav
      aria-label="Paginación"
      className={`flex items-center justify-between sm:justify-center gap-4 pt-6 border-t border-tertiary/15 ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={isFirstPage}
        onClick={() => handlePageChange(page - 1)}
        aria-label="Ir a la página anterior"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>

      <span className="text-xs sm:text-sm font-medium text-primary">
        Página <strong className="font-bold text-secondary">{page}</strong> de{' '}
        <strong className="font-bold">{totalPages}</strong>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={isLastPage}
        onClick={() => handlePageChange(page + 1)}
        aria-label="Ir a la página siguiente"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
};
