import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ui/Toast.js';
import { getErrorMessage } from '../../../lib/errors.js';
import { formatPoints } from '../../../lib/format.js';
import type { Cart, CheckoutResult, User } from '../../../types/api.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import {
  addCartItemApi,
  checkoutApi,
  getCartApi,
  removeCartItemApi,
  updateCartItemApi,
} from '../api/cartApi.js';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const cartQuery = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: getCartApi,
    enabled: isAuthenticated,
  });

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity?: number }) =>
      addCartItemApi(productId, quantity),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart);
      success('Producto agregado al carrito');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      updateCartItemApi(productId, quantity),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart);
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: number) => removeCartItemApi(productId),
    onSuccess: (newCart) => {
      queryClient.setQueryData(['cart'], newCart);
      success('Producto eliminado del carrito');
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: checkoutApi,
    onSuccess: (result: CheckoutResult) => {
      // 1. Actualizar caché de usuario con el nuevo saldo de puntos
      queryClient.setQueryData<User>(['me'], (old) => {
        if (!old) return old;
        return { ...old, pointsBalance: result.pointsBalance };
      });

      // 2. Invalidar carrito y productos (por stock)
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // 3. Notificación con puntos ganados
      if (result.pointsAwarded > 0) {
        success(`¡Compra exitosa! Has ganado +${formatPoints(result.pointsAwarded)} puntos.`);
      } else {
        success('¡Compra realizada con éxito!');
      }
    },
    onError: (err) => {
      toastError(getErrorMessage(err));
    },
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    error: cartQuery.error,
    refetch: cartQuery.refetch,
    addItem: addItemMutation.mutate,
    isAdding: addItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    isUpdating: updateItemMutation.isPending,
    removeItem: removeItemMutation.mutate,
    isRemoving: removeItemMutation.isPending,
    checkout: checkoutMutation.mutate,
    isCheckingOut: checkoutMutation.isPending,
  };
}
