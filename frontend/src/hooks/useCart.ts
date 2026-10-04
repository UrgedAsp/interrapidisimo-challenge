import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Cart } from '@/types';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Cart }>('/cart');
      return data.data;
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity?: number }) => {
      const { data } = await apiClient.post<{ data: Cart }>('/cart/items', {
        productId,
        quantity: quantity ?? 1,
      });
      return data.data;
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      const { data } = await apiClient.patch<{ data: Cart }>(`/cart/items/${productId}`, {
        quantity,
      });
      return data.data;
    },
    // Actualización optimista
    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData<Cart>(['cart']);

      if (previous) {
        const optimistic: Cart = {
          ...previous,
          items:
            quantity === 0
              ? previous.items.filter((i) => i.product_id !== productId)
              : previous.items.map((i) =>
                  i.product_id === productId
                    ? { ...i, quantity, subtotal: i.price * quantity }
                    : i
                ),
        };
        optimistic.total = optimistic.items.reduce((s, i) => s + i.subtotal, 0);
        optimistic.itemCount = optimistic.items.reduce((s, i) => s + i.quantity, 0);
        queryClient.setQueryData(['cart'], optimistic);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['cart'], context.previous);
      }
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: number) => {
      const { data } = await apiClient.delete<{ data: Cart }>(`/cart/items/${productId}`);
      return data.data;
    },
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData<Cart>(['cart']);

      if (previous) {
        const optimistic: Cart = {
          ...previous,
          items: previous.items.filter((i) => i.product_id !== productId),
        };
        optimistic.total = optimistic.items.reduce((s, i) => s + i.subtotal, 0);
        optimistic.itemCount = optimistic.items.reduce((s, i) => s + i.quantity, 0);
        queryClient.setQueryData(['cart'], optimistic);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['cart'], context.previous);
      }
    },
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });
}
