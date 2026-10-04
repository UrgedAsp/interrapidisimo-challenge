import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient.js';
import { useApplyPoints } from '../../../hooks/useApplyPoints.js';
import type { CheckoutResult } from '../../../types/api.js';
import { checkoutApi } from '../api/cartApi.js';
import { useCartDrawer } from '../CartDrawerProvider.js';

export interface CheckoutErrorState {
  code: string;
  message: string;
  details?: Array<{ productId?: number; message: string }>;
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const { applyPoints } = useApplyPoints();
  const { setView, setLastOrder } = useCartDrawer();
  const [checkoutError, setCheckoutError] = useState<CheckoutErrorState | null>(null);

  const mutation = useMutation({
    mutationKey: ['cart', 'checkout'],
    mutationFn: checkoutApi,
    onMutate: () => {
      setCheckoutError(null);
    },
    onSuccess: (result: CheckoutResult) => {
      // 1. Actualizar puntos en ['me'] sin duplicar notificación (notify: false)
      applyPoints({
        pointsAwarded: result.pointsAwarded,
        pointsBalance: result.pointsBalance,
        notify: false,
      });

      // 2. Guardar orden y pasar a vista de confirmación
      setLastOrder(result);
      setView('confirmation');

      // 3. Invalidar queries dependientes
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.code === 'OUT_OF_STOCK') {
          setCheckoutError({
            code: 'OUT_OF_STOCK',
            message: 'Algunos productos ya no tienen stock suficiente.',
            details: err.details,
          });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          return;
        }

        if (err.code === 'CART_EMPTY') {
          setCheckoutError({
            code: 'CART_EMPTY',
            message: 'Tu carrito está vacío.',
          });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          return;
        }

        setCheckoutError({
          code: err.code,
          message: 'No pudimos confirmar tu compra. Revisa tu carrito antes de reintentar.',
        });
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
        return;
      }

      setCheckoutError({
        code: 'UNKNOWN_ERROR',
        message: 'No pudimos confirmar tu compra. Revisa tu carrito antes de reintentar.',
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    ...mutation,
    checkout: mutation.mutate,
    isCheckingOut: mutation.isPending,
    checkoutError,
    clearCheckoutError: () => setCheckoutError(null),
  };
}
