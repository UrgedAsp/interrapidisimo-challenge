import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartDrawer } from '../CartDrawerProvider.js';
import { useCart } from '../hooks/useCart.js';

export const CartButton: React.FC = () => {
  const { cart } = useCart();
  const { openCart, isOpen } = useCartDrawer();

  const itemCount = cart?.itemCount ?? 0;
  const badgeText = itemCount > 99 ? '99+' : String(itemCount);

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        aria-label={`Carrito de compras con ${itemCount} productos`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="relative p-2.5 text-primary hover:text-secondary rounded-[var(--radius-field)] hover:bg-tertiary/10 transition-colors cursor-pointer focus-visible:outline-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <ShoppingBag size={22} aria-hidden="true" />
        {itemCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-neutral bg-secondary rounded-full px-1 shadow-xs animate-in zoom-in-50 duration-200">
            {badgeText}
          </span>
        )}
      </button>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {itemCount === 1 ? '1 producto en el carrito' : `${itemCount} productos en el carrito`}
      </span>
    </>
  );
};
