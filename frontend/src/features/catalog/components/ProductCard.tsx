import React from 'react';
import { ProductImage } from '../../../components/ui/ProductImage.js';
import { formatCOP } from '../../../lib/format.js';
import type { Product } from '../../../types/api.js';
import { AddToCartButton } from '../../cart/index.js';
import { FavoriteButton } from '../../favorites/index.js';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product }) => {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="group flex flex-col justify-between bg-neutral border border-tertiary/20 rounded-[var(--radius-card)] p-4 hover:border-tertiary/60 transition-all duration-200">
      <div>
        <div className="relative mb-3">
          <ProductImage src={product.imageUrl} alt={product.name} />
          <div className="absolute top-2 right-2">
            <FavoriteButton
              productId={product.id}
              productName={product.name}
              isFavorite={product.isFavorite}
            />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
            {product.category.name}
          </span>
          <h3 className="font-medium text-primary line-clamp-2 text-sm leading-snug">
            {product.name}
          </h3>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-tertiary/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-primary font-headline">
            {formatCOP(product.price)}
          </span>

          {isOutOfStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-error/10 text-error">
              Agotado
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary/15 text-secondary">
              Últimas {product.stock} unidades
            </span>
          ) : null}
        </div>

        <AddToCartButton
          productId={product.id}
          productName={product.name}
          stock={product.stock}
          disabled={isOutOfStock}
        />
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
