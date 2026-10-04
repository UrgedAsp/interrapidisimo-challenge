import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { formatCOP, formatPoints } from '../../../lib/format.js';
import type { CheckoutResult } from '../../../types/api.js';

export interface OrderConfirmationProps {
  orderResult: CheckoutResult;
  onContinueShopping: () => void;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  orderResult,
  onContinueShopping,
}) => {
  const { order, pointsAwarded, pointsBalance } = orderResult;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col justify-between h-full space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-6">
        {/* Cabecera de éxito */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary/15 text-secondary mx-auto">
            <CheckCircle2 size={32} aria-hidden="true" />
          </div>
          <h3
            ref={headingRef}
            id="confirmation-title"
            tabIndex={-1}
            className="text-xl sm:text-2xl font-bold text-primary font-headline focus:outline-none"
          >
            ¡Compra realizada!
          </h3>
          <p className="text-xs sm:text-sm text-primary/60">
            Orden <strong className="font-semibold text-primary">#{order.id}</strong> confirmada exitosamente.
          </p>
        </div>

        {/* Tarjeta de Recompensas */}
        <div className="p-4 bg-tertiary/15 border border-tertiary/30 rounded-[var(--radius-card)] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <Sparkles size={16} aria-hidden="true" />
            <span>Puntos acumulados</span>
          </div>
          <div className="text-sm font-medium text-primary">
            Ganaste <strong className="font-bold text-secondary">+{formatPoints(pointsAwarded)}</strong> puntos con esta compra.
          </div>
          <div className="text-xs text-primary/70">
            Ahora tienes <strong className="font-semibold text-primary">{formatPoints(pointsBalance)}</strong> puntos en tu cuenta.
          </div>
        </div>

        {/* Detalle de Productos */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary/60 border-b border-tertiary/15 pb-2">
            Resumen de productos
          </h4>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between items-start text-xs sm:text-sm gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium text-primary line-clamp-1">{item.name}</p>
                  <p className="text-xs text-primary/60">
                    {item.quantity} × {formatCOP(item.unitPrice)}
                  </p>
                </div>
                <span className="font-semibold text-primary shrink-0">
                  {formatCOP(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-baseline pt-3 border-t border-tertiary/20">
            <span className="text-sm font-bold text-primary">Total pagado</span>
            <span className="text-lg font-bold text-primary font-headline text-secondary">
              {formatCOP(order.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-tertiary/20">
        <Button
          type="button"
          variant="primary"
          fullWidth
          onClick={onContinueShopping}
          aria-label="Seguir comprando y cerrar confirmación"
        >
          Seguir comprando
        </Button>
      </div>
    </div>
  );
};
