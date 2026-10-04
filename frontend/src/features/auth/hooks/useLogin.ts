import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginResult } from '../../../types/api.js';
import { loginApi } from '../api/authApi.js';
import type { LoginCredentials } from '../types/index.js';
import { useAuth } from './useAuth.js';

export function useLogin() {
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => loginApi(credentials.email, credentials.password),
    onSuccess: (result: LoginResult) => {
      login(result.token);
      queryClient.setQueryData(['me'], result.user);
    },
  });
}
