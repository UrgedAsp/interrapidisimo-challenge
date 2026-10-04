import { useIsMutating, useQuery } from '@tanstack/react-query';
import type { Cart } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { getCartApi } from '../api/cartApi.js';
import { useAddToCart } from './useAddToCart.js';
import { useCheckout } from './useCheckout.js';
import { useRemoveCartItem } from './useRemoveCartItem.js';
import { useUpdateCartItem } from './useUpdateCartItem.js';

export function useCart() {
  const { isAuthenticated } = useAuth();

  const cartQuery = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const isMutatingCart = useIsMutating({ mutationKey: ['cart'] }) > 0;

  const { mutate: addItem, isPending: isAdding } = useAddToCart();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCartItem();
  const { mutate: removeItem, isPending: isRemoving } = useRemoveCartItem();
  const { checkout, isCheckingOut, checkoutError, clearCheckoutError } = useCheckout();

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    error: cartQuery.error,
    refetch: cartQuery.refetch,
    isMutating: isMutatingCart,
    addItem,
    isAdding,
    updateItem,
    isUpdating,
    removeItem,
    isRemoving,
    checkout,
    isCheckingOut,
    checkoutError,
    clearCheckoutError,
  };
}
