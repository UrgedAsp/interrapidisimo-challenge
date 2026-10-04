import React, { type ReactNode } from 'react';

export interface ProductGridProps {
  children: ReactNode;
  ariaBusy?: boolean;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  children,
  ariaBusy = false,
  className = '',
}) => {
  return (
    <div
      aria-busy={ariaBusy}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-200 ${
        ariaBusy ? 'opacity-60 pointer-events-none' : 'opacity-100'
      } ${className}`}
    >
      {children}
    </div>
  );
};
