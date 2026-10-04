import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useFavorites } from '../hooks/useFavorites.js';

export interface FavoriteButtonProps {
  productId: number;
  productName: string;
  isFavorite?: boolean;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  productName,
  isFavorite = false,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useFavorites();

  const isPending = isAdding || isRemoving;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (isFavorite) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={
        isFavorite
          ? `Quitar ${productName} de favoritos`
          : `Marcar ${productName} como favorito`
      }
      aria-pressed={isFavorite}
      className={`p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-secondary ${
        isFavorite
          ? 'bg-neutral/90 text-secondary'
          : 'bg-neutral/70 text-primary/40 hover:text-secondary'
      } ${className}`}
    >
      <Heart
        size={18}
        fill={isFavorite ? 'currentColor' : 'none'}
        className="transition-transform active:scale-125"
        aria-hidden="true"
      />
    </button>
  );
};
