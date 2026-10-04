import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '../../../components/product/ProductCard.js';
import { ProductCardSkeleton } from '../../../components/product/ProductCardSkeleton.js';
import { ProductGrid } from '../../../components/product/ProductGrid.js';
import { Button } from '../../../components/ui/Button.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import { AddToCartButton } from '../../cart/index.js';
import { FavoriteButton } from '../components/FavoriteButton.js';
import { useFavorites } from '../hooks/useFavorites.js';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: favorites = [], isLoading, isError, error, refetch } = useFavorites();

  const total = favorites.length;

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex items-baseline justify-between border-b border-tertiary/15 pb-4">
        <h1
          id="favorites-heading"
          tabIndex={-1}
          className="text-2xl sm:text-3xl font-bold text-primary font-headline tracking-tight focus:outline-none"
        >
          Favoritos
        </h1>

        {!isLoading && !isError && (
          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-xs sm:text-sm font-medium text-primary/60"
          >
            {total} {total === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>

      {/* Contenido según estados */}
      {isLoading ? (
        <ProductGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </ProductGrid>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon={<Heart size={48} className="text-secondary/60" />}
          title="Aún no tienes favoritos"
          description="Marca productos con el corazón para encontrarlos aquí."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Explorar catálogo
            </Button>
          }
        />
      ) : (
        <ProductGrid>
          {favorites.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favoriteSlot={<FavoriteButton product={product} />}
              cartSlot={
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  stock={product.stock}
                  product={product}
                />
              }
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
};
