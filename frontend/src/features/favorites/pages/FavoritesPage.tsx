import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import { ProductImage } from '../../../components/ui/ProductImage.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { formatCOP } from '../../../lib/format.js';
import { useCart } from '../../cart/hooks/useCart.js';
import { useFavorites } from '../hooks/useFavorites.js';

export const FavoritesPage: React.FC = () => {
  const { favorites, isLoading, isError, error, refetch, removeFavorite, isRemoving } = useFavorites();
  const { addItem, isAdding } = useCart();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary font-headline">Tus Favoritos</h1>
        <p className="text-primary/70 text-sm mt-1">Productos que has guardado para más tarde</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-tertiary/20 rounded-[var(--radius-card)] p-4 space-y-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} aria-hidden="true" />}
          title="No tienes favoritos guardados"
          description="Explora nuestro catálogo y marca productos con el corazón para guardarlos aquí y ganar puntos."
          action={
            <Link to="/">
              <Button variant="primary">Explorar catálogo</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col justify-between bg-neutral border border-tertiary/20 rounded-[var(--radius-card)] p-4 hover:border-tertiary/60 transition-all duration-200"
            >
              <div>
                <div className="relative mb-3">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => removeFavorite(product.id)}
                    aria-label={`Quitar ${product.name} de favoritos`}
                    className="absolute top-2 right-2 p-2 rounded-full bg-neutral/90 text-secondary hover:text-primary transition-colors shadow-xs cursor-pointer focus-visible:outline-secondary"
                  >
                    <Heart size={18} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                    {product.category.name}
                  </span>
                  <h3 className="font-medium text-primary line-clamp-2 text-sm">{product.name}</h3>
                  <p className="text-base font-bold text-primary font-headline">
                    {formatCOP(product.price)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-tertiary/10">
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  disabled={product.stock === 0 || isAdding}
                  onClick={() => addItem({ productId: product.id, quantity: 1 })}
                  className="gap-2 text-xs"
                >
                  <ShoppingBag size={14} aria-hidden="true" />
                  {product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
