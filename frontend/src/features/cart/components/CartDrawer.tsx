import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.js';
import { Drawer } from '../../../components/ui/Drawer.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { useCartDrawer } from '../CartDrawerProvider.js';
import { useCart } from '../hooks/useCart.js';
import { CartItemRow } from './CartItemRow.js';
import { CartSummary } from './CartSummary.js';
import { OrderConfirmation } from './OrderConfirmation.js';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, closeCart, view, lastOrder } = useCartDrawer();
  const {
    cart,
    isLoading,
    isError,
    error,
    refetch,
    isMutating,
    updateItem,
    removeItem,
    checkout,
    isCheckingOut,
    checkoutError,
  } = useCart();

  const items = cart?.items ?? [];
  const itemCount = cart?.itemCount ?? 0;

  const handleExploreProducts = () => {
    closeCart();
    navigate('/');
  };

  const isConfirmationView = view === 'confirmation' && lastOrder;
  const drawerTitle = isConfirmationView ? 'Confirmación' : 'Tu carrito';

  return (
    <Drawer isOpen={isOpen} onClose={closeCart} title={drawerTitle}>
      {isConfirmationView ? (
        <OrderConfirmation
          orderResult={lastOrder}
          onContinueShopping={closeCart}
        />
      ) : isLoading && !cart ? (
        <div className="space-y-4 py-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 py-3 border-b border-tertiary/15">
              <Skeleton className="w-16 h-16 rounded-[var(--radius-field)] shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : itemCount === 0 ? (
        <EmptyState
          title="Tu carrito está vacío"
          description="Aún no has agregado productos a tu carrito. ¡Descubre nuestro catálogo y aprovecha las mejores ofertas!"
          action={
            <Button variant="primary" onClick={handleExploreProducts}>
              Explorar productos
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col justify-between h-full space-y-4">
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            {items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                disabled={isMutating || isCheckingOut}
                onUpdateQuantity={(productId, newQty) =>
                  updateItem({ productId, quantity: newQty })
                }
                onRemove={(productId) => removeItem(productId)}
              />
            ))}
          </div>

          <CartSummary
            cart={cart}
            isMutating={isMutating}
            isCheckingOut={isCheckingOut}
            checkoutError={checkoutError}
            onCheckout={checkout}
          />
        </div>
      )}
    </Drawer>
  );
};
