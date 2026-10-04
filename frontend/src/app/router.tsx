import React from 'react';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.js';
import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { CatalogPage } from '../features/catalog/pages/CatalogPage.js';
import { FavoritesPage } from '../features/favorites/pages/FavoritesPage.js';
import { AppLayout } from './layout/AppLayout.js';

export { ProtectedRoute };

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
