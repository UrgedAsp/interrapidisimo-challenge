import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { ProductImage } from '../../../components/ui/ProductImage.js';
import { formatCOP } from '../../../lib/format.js';
import type { CartItem } from '../../../types/api.js';
import { QuantityStepper } from './QuantityStepper.js';

export interface CartItemRowProps {
  item: CartItem;
  disabled?: boolean;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemove: (productId: number) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  disabled = false,
  onUpdateQuantity,
  onRemove,
}) => {
  const isOverStock = item.quantity > item.stock;

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-tertiary/15 transition-colors ${
        isOverStock ? 'bg-error/5 p-2 rounded-[var(--radius-field)]' : ''
      }`}
    >
      {/* Miniatura */}
      <div className="w-16 h-16 shrink-0 rounded-[var(--radius-field)] overflow-hidden bg-neutral border border-tertiary/20">
        <ProductImage src={item.imageUrl} alt={item.name} />
      </div>

      {/* Info y Controles */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            title={item.name}
            className="text-xs sm:text-sm font-medium text-primary line-clamp-1"
          >
            {item.name}
          </h4>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(item.productId)}
            aria-label={`Quitar ${item.name} del carrito`}
            className="text-primary/40 hover:text-error disabled:opacity-40 transition-colors p-1 rounded-sm cursor-pointer focus-visible:outline-error"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-primary/60">
          {formatCOP(item.price)} c/u
        </p>

        {isOverStock && (
          <div
            role="alert"
            className="flex items-center gap-1 text-xs text-error font-medium"
          >
            <AlertCircle size={12} aria-hidden="true" />
            <span>Solo quedan {item.stock}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <QuantityStepper
            productId={item.productId}
            productName={item.name}
            quantity={item.quantity}
            stock={item.stock}
            disabled={disabled}
            onQuantityChange={(newQty) => onUpdateQuantity(item.productId, newQty)}
          />

          <span className="text-xs sm:text-sm font-bold text-primary">
            {formatCOP(item.subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
};
