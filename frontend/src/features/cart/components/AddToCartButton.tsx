import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';

export interface AddToCartButtonProps {
  productId: number;
  productName: string;
  stock: number;
  disabled?: boolean;
  className?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  productName,
  stock,
  disabled = false,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, isAdding } = useCart();

  const isOutOfStock = stock <= 0;
  const isDisabled = disabled || isOutOfStock;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    addItem({ productId, quantity: 1 });
  };

  return (
    <Button
      type="button"
      variant={isOutOfStock ? 'outline' : 'secondary'}
      size="sm"
      fullWidth
      disabled={isDisabled}
      loading={isAdding}
      onClick={handleClick}
      aria-label={
        isOutOfStock
          ? `${productName} agotado`
          : `Agregar ${productName} al carrito`
      }
      className={className}
    >
      <ShoppingBag size={16} aria-hidden="true" />
      <span>{isOutOfStock ? 'Agotado' : 'Agregar'}</span>
    </Button>
  );
};
