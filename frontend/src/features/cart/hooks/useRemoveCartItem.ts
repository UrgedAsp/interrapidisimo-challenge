import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../components/ui/Toast.js';
import { getErrorMessage } from '../../../lib/errors.js';
import type { Cart } from '../../../types/api.js';
import { removeCartItemApi } from '../api/cartApi.js';
import { withoutItem } from '../utils/cartMath.js';

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();

  return useMutation({
    mutationKey: ['cart', 'remove'],
    mutationFn: (productId: number) => removeCartItemApi(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      if (previousCart) {
        const optimisticCart = withoutItem(previousCart, productId);
        queryClient.setQueryData(['cart'], optimisticCart);
      }

      return { previousCart };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }

      toastError(getErrorMessage(err));
    },
    onSuccess: (serverCart) => {
      queryClient.setQueryData(['cart'], serverCart);
      toastSuccess('Producto eliminado del carrito');
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['cart'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}
