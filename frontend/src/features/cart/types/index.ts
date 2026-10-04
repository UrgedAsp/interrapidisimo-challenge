import type { CheckoutResult } from '../../../types/api.js';

export type CartDrawerView = 'cart' | 'confirmation';

export interface CartDrawerState {
  isOpen: boolean;
  view: CartDrawerView;
  lastOrder: CheckoutResult | null;
}
