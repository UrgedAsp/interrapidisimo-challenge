import React from 'react';
import { Minus, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { Drawer } from '../../../components/ui/Drawer.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { ErrorState } from '../../../components/ui/ErrorState.js';
import { ProductImage } from '../../../components/ui/ProductImage.js';
import { Skeleton } from '../../../components/ui/Skeleton.js';
import { formatCOP, formatPoints } from '../../../lib/format.js';
import { useCart } from '../hooks/useCart.js';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    isLoading,
    isError,
    error,
    refetch,
    updateItem,
    removeItem,
    checkout,
    isCheckingOut,
    isUpdating,
    isRemoving,
  } = useCart();

  const handleCheckout = () => {
    checkout(undefined, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const estimatedPoints = cart
    ? Math.floor(cart.total / 1000) + cart.items.length * 5
    : 0;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Tu Carrito">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={32} aria-hidden="true" />}
          title="Tu carrito está vacío"
          description="Explora nuestro catálogo y agrega los productos que más te gusten para acumular puntos."
          action={
            <Button variant="secondary" onClick={onClose}>
              Ver productos
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col h-full justify-between">
          {/* Listado de ítems */}
          <div className="divide-y divide-tertiary/20 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {cart.items.map((item) => (
              <div key={item.productId} className="py-4 flex gap-4 items-center">
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-primary truncate">{item.name}</h4>
                  <p className="text-xs text-primary/60">{formatCOP(item.price)} c/u</p>
                  <p className="text-xs font-semibold text-secondary mt-0.5">
                    Subtotal: {formatCOP(item.subtotal)}
                  </p>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      disabled={item.quantity <= 1 || isUpdating}
                      onClick={() =>
                        updateItem({ productId: item.productId, quantity: item.quantity - 1 })
                      }
                      aria-label="Disminuir cantidad"
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-tertiary/40 hover:bg-tertiary/10 disabled:opacity-40 disabled:cursor-not-allowed text-primary"
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>

                    <span className="text-xs font-semibold px-2 min-w-[20px] text-center">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      disabled={item.quantity >= item.stock || item.quantity >= 99 || isUpdating}
                      onClick={() =>
                        updateItem({ productId: item.productId, quantity: item.quantity + 1 })
                      }
                      aria-label="Aumentar cantidad"
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-tertiary/40 hover:bg-tertiary/10 disabled:opacity-40 disabled:cursor-not-allowed text-primary"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Eliminar ${item.name} del carrito`}
                  className="p-2 text-primary/40 hover:text-error transition-colors cursor-pointer"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen de compra */}
          <div className="border-t border-tertiary/20 pt-4 mt-4 bg-neutral">
            <div className="bg-tertiary/10 border border-tertiary/20 p-3 rounded-[var(--radius-card)] mb-4 flex items-center gap-2 text-xs text-primary">
              <Sparkles size={16} className="text-secondary shrink-0" aria-hidden="true" />
              <span>
                Con esta compra acumularás{' '}
                <strong className="text-secondary font-bold">+{formatPoints(estimatedPoints)} puntos</strong>.
              </span>
            </div>

            <div className="flex justify-between text-sm text-primary/70 mb-1">
              <span>Unidades ({cart.itemCount})</span>
              <span>{cart.itemCount}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-primary mb-4 font-headline">
              <span>Total</span>
              <span>{formatCOP(cart.total)}</span>
            </div>

            <Button
              variant="primary"
              fullWidth
              loading={isCheckingOut}
              onClick={handleCheckout}
            >
              Completar pedido ({formatCOP(cart.total)})
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
