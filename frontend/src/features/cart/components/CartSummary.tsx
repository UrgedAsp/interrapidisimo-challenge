import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { formatCOP } from '../../../lib/format.js';
import type { Cart } from '../../../types/api.js';
import type { CheckoutErrorState } from '../hooks/useCheckout.js';

export interface CartSummaryProps {
  cart: Cart | undefined;
  isMutating?: boolean;
  isCheckingOut?: boolean;
  checkoutError?: CheckoutErrorState | null;
  onCheckout: () => void;
  className?: string;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  isMutating = false,
  isCheckingOut = false,
  checkoutError,
  onCheckout,
  className = '',
}) => {
  const itemCount = cart?.itemCount ?? 0;
  const total = cart?.total ?? 0;
  const items = cart?.items ?? [];

  const hasOverStock = items.some((item) => item.quantity > item.stock);
  const isCheckoutDisabled = itemCount === 0 || isCheckingOut || isMutating || hasOverStock;

  return (
    <div className={`border-t border-tertiary/20 pt-4 space-y-4 ${className}`}>
      {checkoutError && (
        <div
          role="alert"
          className="p-3 bg-error/10 border border-error/20 rounded-[var(--radius-field)] text-error text-xs font-medium space-y-1"
        >
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{checkoutError.message}</span>
          </div>
          {checkoutError.details && checkoutError.details.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 text-error/90 pl-1">
              {checkoutError.details.map((detail, idx) => (
                <li key={idx}>{detail.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasOverStock && (
        <div
          role="alert"
          className="p-3 bg-error/10 border border-error/20 rounded-[var(--radius-field)] text-error text-xs font-medium"
        >
          Ajusta las cantidades de los productos que superan el stock disponible antes de continuar.
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-primary/70">
          <span>Unidades ({itemCount})</span>
          <span>{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</span>
        </div>
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-base font-bold text-primary font-headline">Total</span>
          <span className="text-xl font-bold text-primary font-headline text-secondary">
            {formatCOP(total)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        fullWidth
        disabled={isCheckoutDisabled}
        loading={isCheckingOut}
        onClick={onCheckout}
        className="mt-2"
        aria-label={`Finalizar compra por un total de ${formatCOP(total)}`}
      >
        Finalizar compra
      </Button>
    </div>
  );
};
