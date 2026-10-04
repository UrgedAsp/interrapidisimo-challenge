import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Product } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useToggleFavorite } from '../hooks/useToggleFavorite.js';

export interface FavoriteButtonProps {
  product?: Product;
  productId?: number;
  productName?: string;
  isFavorite?: boolean;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  product,
  productId,
  productName,
  isFavorite: isFavoriteProp,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const id = product?.id ?? productId ?? 0;
  const name = product?.name ?? productName ?? '';
  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : Boolean(product?.isFavorite);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    const targetProduct: Product = product ?? {
      id,
      name,
      price: 0,
      imageUrl: '',
      stock: 0,
      category: { id: 0, name: '', slug: '' },
      isFavorite,
    };

    toggleFavorite({ product: targetProduct, next: !isFavorite });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isFavorite
          ? `Quitar ${name} de favoritos`
          : `Marcar como favorito: ${name}`
      }
      aria-pressed={isFavorite}
      className={`p-2.5 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-secondary min-w-[44px] min-h-[44px] flex items-center justify-center ${
        isFavorite
          ? 'bg-neutral/90 text-secondary'
          : 'bg-neutral/70 text-primary/40 hover:text-secondary'
      } ${className}`}
    >
      <Heart
        size={20}
        fill={isFavorite ? 'currentColor' : 'none'}
        className="transition-transform active:scale-125"
        aria-hidden="true"
      />
    </button>
  );
};
