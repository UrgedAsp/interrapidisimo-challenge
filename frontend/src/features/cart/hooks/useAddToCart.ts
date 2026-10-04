import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../api/apiClient.js';
import { useToast } from '../../../components/ui/Toast.js';
import { getErrorMessage } from '../../../lib/errors.js';
import type { Cart, Product } from '../../../types/api.js';
import { addCartItemApi } from '../api/cartApi.js';
import { withItemAdded } from '../utils/cartMath.js';

export interface AddToCartVariables {
  productId: number;
  quantity?: number;
  product?: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'stock'>;
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();

  return useMutation({
    mutationKey: ['cart', 'add'],
    mutationFn: ({ productId, quantity = 1 }: AddToCartVariables) =>
      addCartItemApi(productId, quantity),
    onMutate: async ({ quantity = 1, product }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      if (previousCart && product) {
        const optimisticCart = withItemAdded(previousCart, product, quantity);
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
      toastSuccess('Producto agregado al carrito');
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['cart'] }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });
}
