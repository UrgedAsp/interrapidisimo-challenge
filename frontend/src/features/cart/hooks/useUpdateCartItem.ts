import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient.js';
import { useToast } from '../../../components/ui/Toast.js';
import { getErrorMessage } from '../../../lib/errors.js';
import type { Cart } from '../../../types/api.js';
import { updateCartItemApi } from '../api/cartApi.js';
import { withQuantity } from '../utils/cartMath.js';

export interface UpdateCartItemVariables {
  productId: number;
  quantity: number;
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  return useMutation({
    mutationKey: ['cart', 'update'],
    mutationFn: ({ productId, quantity }: UpdateCartItemVariables) =>
      updateCartItemApi(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      if (previousCart) {
        const optimisticCart = withQuantity(previousCart, productId, quantity);
        queryClient.setQueryData(['cart'], optimisticCart);
      }

      return { previousCart };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }

      toastError(getErrorMessage(err));

      if (err instanceof ApiError && err.code === 'OUT_OF_STOCK') {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
    onSuccess: (serverCart) => {
      queryClient.setQueryData(['cart'], serverCart);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['cart'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}
