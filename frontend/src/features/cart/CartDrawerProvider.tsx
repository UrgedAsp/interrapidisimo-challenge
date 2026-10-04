import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { CheckoutResult } from '../../types/api.js';
import { useAuth } from '../auth/hooks/useAuth.js';
import type { CartDrawerView } from './types/index.js';

export interface CartDrawerContextValue {
  isOpen: boolean;
  view: CartDrawerView;
  lastOrder: CheckoutResult | null;
  openCart: () => void;
  closeCart: () => void;
  setView: (view: CartDrawerView) => void;
  setLastOrder: (result: CheckoutResult | null) => void;
  resetCartDrawer: () => void;
}

export const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export const CartDrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CartDrawerView>('cart');
  const [lastOrder, setLastOrder] = useState<CheckoutResult | null>(null);

  const resetCartDrawer = useCallback(() => {
    setView('cart');
    setLastOrder(null);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
    resetCartDrawer();
  }, [resetCartDrawer]);

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Al cerrar sesión, cerrar y reiniciar estado del drawer
  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false);
      resetCartDrawer();
    }
  }, [isAuthenticated, resetCartDrawer]);

  const value: CartDrawerContextValue = {
    isOpen,
    view,
    lastOrder,
    openCart,
    closeCart,
    setView,
    setLastOrder,
    resetCartDrawer,
  };

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
};

export function useCartDrawer(): CartDrawerContextValue {
  const context = useContext(CartDrawerContext);
  if (!context) {
    return {
      isOpen: false,
      view: 'cart',
      lastOrder: null,
      openCart: () => {},
      closeCart: () => {},
      setView: () => {},
      setLastOrder: () => {},
      resetCartDrawer: () => {},
    };
  }
  return context;
}
