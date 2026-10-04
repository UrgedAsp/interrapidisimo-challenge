import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '../../api/apiClient.js';
import { getToken, removeToken, setToken } from '../../lib/tokenStorage.js';

export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
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

  const login = useCallback(
    (newToken: string) => {
      setToken(newToken);
      setLocalToken(newToken);
    },
    [],
  );

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const value: AuthContextValue = {
    token,
    isAuthenticated: Boolean(token),
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
