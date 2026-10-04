import React, { type ReactNode } from 'react';
import { formatCOP } from '../../lib/format.js';
import type { Product } from '../../types/api.js';
import { ProductImage } from '../ui/ProductImage.js';

export interface ProductCardProps {
  product: Product;
  favoriteSlot?: ReactNode;
  cartSlot?: ReactNode;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({ product, favoriteSlot, cartSlot, className = '' }) => {
    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock > 0 && product.stock <= 5;

    return (
      <div
        className={`group flex flex-col justify-between bg-neutral border border-tertiary/20 rounded-[var(--radius-card)] p-4 hover:border-tertiary/60 transition-all duration-200 ${className}`}
      >
        <div>
          <div className="relative mb-3">
            <ProductImage src={product.imageUrl} alt={product.name} />
            {favoriteSlot && (
              <div className="absolute top-2 right-2">
                {favoriteSlot}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
              {product.category.name}
            </span>
            <h3
              title={product.name}
              className="font-medium text-primary line-clamp-2 text-sm leading-snug"
            >
              {product.name}
            </h3>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-tertiary/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base sm:text-lg font-bold text-primary font-headline truncate">
              {formatCOP(product.price)}
            </span>

            {isOutOfStock ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-error/10 text-error shrink-0">
                Agotado
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary/15 text-secondary shrink-0">
                Últimas {product.stock} unidades
              </span>
            ) : null}
          </div>

          {cartSlot && <div>{cartSlot}</div>}
        </div>
      </div>
    );
  },
);

ProductCard.displayName = 'ProductCard';
