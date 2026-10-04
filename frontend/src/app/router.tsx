import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { CatalogPage } from '../features/catalog/pages/CatalogPage.js';
import { FavoritesPage } from '../features/favorites/pages/FavoritesPage.js';
import { AppLayout } from './layout/AppLayout.js';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-secondary" />
        <p className="text-xs text-primary/60">Cargando sesión...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<CatalogPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center p-4 bg-neutral">
              <EmptyState
                title="Página no encontrada (404)"
                description="La página que buscas no existe o ha sido movida."
                action={
                  <Link to="/">
                    <Button variant="primary">Volver al inicio</Button>
                  </Link>
                }
              />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
