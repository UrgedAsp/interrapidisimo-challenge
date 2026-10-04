import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QuantityStepperProps {
  productId: number;
  productName: string;
  quantity: number;
  stock: number;
  disabled?: boolean;
  onQuantityChange: (newQuantity: number) => void;
  className?: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  productName,
  quantity,
  stock,
  disabled = false,
  onQuantityChange,
  className = '',
}) => {
  const max = Math.min(stock, 99);
  const canDecrease = quantity > 1 && !disabled;
  const canIncrease = quantity < max && !disabled;

  const handleDecrease = () => {
    if (canDecrease) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center border border-tertiary/30 rounded-[var(--radius-field)] bg-neutral/60 overflow-hidden ${className}`}
    >
      <button
        type="button"
        disabled={!canDecrease}
        onClick={handleDecrease}
        aria-label={`Disminuir cantidad de ${productName}, actual ${quantity}`}
        className="p-1.5 text-primary/70 hover:text-primary hover:bg-tertiary/15 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center focus-visible:outline-secondary"
      >
        <Minus size={14} aria-hidden="true" />
      </button>

      <span
        aria-hidden="true"
        className="px-2 text-xs font-semibold text-primary min-w-[28px] text-center select-none"
      >
        {quantity}
      </span>

      <button
        type="button"
        disabled={!canIncrease}
        onClick={handleIncrease}
        aria-label={`Aumentar cantidad de ${productName}, actual ${quantity}`}
        className="p-1.5 text-primary/70 hover:text-primary hover:bg-tertiary/15 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center focus-visible:outline-secondary"
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
};
