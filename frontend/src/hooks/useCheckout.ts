import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useCheckout() {
  const queryClient = useQueryClient();
  const { updatePoints } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: Order }>('/orders/checkout');
      return data.data;
    },
    onSuccess: (order) => {
      updatePoints(order.totalPoints);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
