import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '../../../api/apiClient.js';
import { getToken, removeToken, setToken } from '../../../lib/token-store.js';
import type { User } from '../../../types/api.js';
import { getMeApi, loginApi } from '../api/authApi.js';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setLocalToken] = useState<string | null>(() => getToken());

  const logout = useCallback(() => {
    removeToken();
    setLocalToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: getMeApi,
    enabled: Boolean(token),
    staleTime: 30 * 1000,
  });

  const login = async (email: string, password: string) => {
    const result = await loginApi(email, password);
    setToken(result.token);
    setLocalToken(result.token);
    queryClient.setQueryData(['me'], result.user);
  };

  const value: AuthContextValue = {
    user: user ?? null,
    token,
    isAuthenticated: Boolean(token),
    isLoading: Boolean(token) && isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
