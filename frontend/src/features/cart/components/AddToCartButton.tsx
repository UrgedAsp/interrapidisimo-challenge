import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.js';
import type { Product } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';

export interface AddToCartButtonProps {
  productId: number;
  productName: string;
  stock: number;
  product?: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'stock'>;
  disabled?: boolean;
  className?: string;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  productId,
  productName,
  stock,
  product,
  disabled = false,
  className = '',
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, addItem } = useCart();

  const inCartItem = cart?.items?.find((item) => item.productId === productId);
  const inCartQuantity = inCartItem?.quantity ?? 0;

  const isOutOfStock = stock <= 0;
  const isMaxInCart = inCartQuantity >= stock && stock > 0;
  const isDisabled = disabled || isOutOfStock || isMaxInCart;

  const buttonText = isOutOfStock
    ? 'Agotado'
    : isMaxInCart
    ? 'Máximo en el carrito'
    : 'Agregar al carrito';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (isDisabled) return;

    addItem({
      productId,
      quantity: 1,
      product: product ?? {
        id: productId,
        name: productName,
        price: 0,
        imageUrl: '',
        stock,
      },
    });
  };

  return (
    <Button
      type="button"
      variant={isOutOfStock || isMaxInCart ? 'outline' : 'secondary'}
      size="sm"
      fullWidth
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={
        isOutOfStock
          ? `${productName} agotado`
          : isMaxInCart
          ? `Máximo de ${productName} alcanzado en el carrito`
          : `Agregar ${productName} al carrito`
      }
      className={className}
    >
      <ShoppingBag size={16} aria-hidden="true" />
      <span>{buttonText}</span>
    </Button>
  );
};
