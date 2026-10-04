import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toast.js';
import { formatPoints } from '../lib/format.js';
import type { User } from '../types/api.js';

export type ApplyPointsParams = {
  pointsAwarded?: number;
  pointsBalance: number;
  message?: string;
  notify?: boolean;
};

/**
 * Hook transversal para sincronizar el saldo de puntos en la caché de ['me']
 * y mostrar un aviso "+N puntos" únicamente cuando pointsAwarded > 0 y notify !== false.
 */
export function useApplyPoints() {
  const queryClient = useQueryClient();
  const { success } = useToast();

  const applyPoints = useCallback(
    ({ pointsAwarded = 0, pointsBalance, message, notify = true }: ApplyPointsParams) => {
      // Actualizar la caché de 'me' de forma atómica sin re-fetchear
      queryClient.setQueryData<User>(['me'], (old) => {
        if (!old) return old;
        return { ...old, pointsBalance };
      });

      // Si se ganaron puntos y notify es true, mostrar el aviso
      if (pointsAwarded > 0 && notify) {
        const pointsText = `+${formatPoints(pointsAwarded)} puntos`;
        success(message ? `${message} (${pointsText})` : `¡Has ganado ${pointsText}!`);
      }
    },
    [queryClient, success],
  );

  return { applyPoints };
}
