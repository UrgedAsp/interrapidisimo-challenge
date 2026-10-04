import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ApiError } from '../../api/apiClient.js';
import { ToastProvider } from '../../components/ui/Toast.js';
import type { ApiList, Product } from '../../types/api.js';
import { AuthProvider } from '../auth/AuthProvider.js';
import { CartDrawerProvider } from '../cart/CartDrawerProvider.js';
import * as favoritesApi from './api/favoritesApi.js';
import { FavoriteButton } from './components/FavoriteButton.js';
import { FavoritesPage } from './pages/FavoritesPage.js';
import {
  withFavoriteAdded,
  withFavoriteFlag,
  withFavoriteRemoved,
} from './utils/favoritesCache.js';

const mockProduct1: Product = {
  id: 1,
  name: 'Gafas de Sol Polarizadas',
  price: 89000,
  imageUrl: 'https://images.unsplash.com/gafas.jpg',
  stock: 12,
  category: { id: 1, name: 'Accesorios', slug: 'accesorios' },
  isFavorite: false,
};

const mockProduct2: Product = {
  id: 2,
  name: 'Reloj Cronógrafo',
  price: 250000,
  imageUrl: 'https://images.unsplash.com/reloj.jpg',
  stock: 0,
  category: { id: 1, name: 'Accesorios', slug: 'accesorios' },
  isFavorite: true,
};

const mockFavoritesList: Product[] = [
  mockProduct2,
  { ...mockProduct1, isFavorite: true },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <CartDrawerProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </CartDrawerProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Favorites Feature (§9 de 20-frontend-favorites.md)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('interrapidisimo.token', 'test-token');
    vi.restoreAllMocks();
    vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue(mockFavoritesList);
  });

  describe('Funciones Puras de Caché (favoritesCache.ts)', () => {
    it('withFavoriteFlag actualiza isFavorite del producto sin mutar el objeto original', () => {
      const original: ApiList<Product> = {
        data: [mockProduct1, mockProduct2],
        meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
      };

      const result = withFavoriteFlag(original, 1, true);

      expect(result?.data[0]?.isFavorite).toBe(true);
      expect(original.data[0]?.isFavorite).toBe(false);
    });

    it('withFavoriteAdded añade el producto al principio con isFavorite: true', () => {
      const initial = [mockProduct2];
      const result = withFavoriteAdded(initial, mockProduct1);

      expect(result.length).toBe(2);
      expect(result[0]?.id).toBe(1);
      expect(result[0]?.isFavorite).toBe(true);
    });

    it('withFavoriteRemoved elimina el producto por id', () => {
      const initial = [mockProduct1, mockProduct2];
      const result = withFavoriteRemoved(initial, 1);

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe(2);
    });
  });

  describe('FavoriteButton (Componente)', () => {
    it('aria-pressed refleja isFavorite y la etiqueta incluye el nombre del producto', () => {
      renderWithProviders(<FavoriteButton product={mockProduct1} isFavorite={false} />);

      const btn = screen.getByRole('button', {
        name: /marcar como favorito: gafas de sol polarizadas/i,
      });
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('al hacer clic en un producto no favorito llama a addFavoriteApi con su id', async () => {
      const addSpy = vi.spyOn(favoritesApi, 'addFavoriteApi').mockResolvedValue({
        productId: 1,
        isFavorite: true,
        pointsAwarded: 2,
        pointsBalance: 102,
      });

      renderWithProviders(<FavoriteButton product={mockProduct1} isFavorite={false} />);

      const btn = screen.getByRole('button', {
        name: /marcar como favorito: gafas de sol polarizadas/i,
      });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith(1);
      });
    });

    it('al hacer clic en un favorito marcado llama a removeFavoriteApi con su id', async () => {
      const removeSpy = vi.spyOn(favoritesApi, 'removeFavoriteApi').mockResolvedValue({
        productId: 2,
        isFavorite: false,
        pointsAwarded: 0,
        pointsBalance: 100,
      });

      renderWithProviders(<FavoriteButton product={mockProduct2} isFavorite={true} />);

      const btn = screen.getByRole('button', {
        name: /quitar reloj cronógrafo de favoritos/i,
      });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith(2);
      });
    });

    it('si la mutación falla, muestra el error en un toast', async () => {
      vi.spyOn(favoritesApi, 'addFavoriteApi').mockRejectedValue(
        new ApiError(500, 'INTERNAL_ERROR', 'Error al conectar con el servidor'),
      );

      renderWithProviders(<FavoriteButton product={mockProduct1} isFavorite={false} />);

      const btn = screen.getByRole('button', {
        name: /marcar como favorito: gafas de sol polarizadas/i,
      });
      fireEvent.click(btn);

      expect(await screen.findByText(/error inesperado en el servidor/i)).toBeInTheDocument();
    });
  });

  describe('Página de Favoritos (FavoritesPage)', () => {
    it('muestra el listado de favoritos con sus nombres y categorías', async () => {
      renderWithProviders(<FavoritesPage />);

      expect(await screen.findByText('Reloj Cronógrafo')).toBeInTheDocument();
      expect(screen.getByText('Gafas de Sol Polarizadas')).toBeInTheDocument();
      expect(screen.getByText(/2 productos/i)).toBeInTheDocument();
    });

    it('un producto con stock 0 muestra insignia "Agotado" y botón deshabilitado', async () => {
      renderWithProviders(<FavoritesPage />);

      expect(await screen.findByText('Reloj Cronógrafo')).toBeInTheDocument();
      expect(screen.getAllByText(/agotado/i).length).toBeGreaterThanOrEqual(1);
      const addBtn = screen.getByRole('button', { name: /reloj cronógrafo agotado/i });
      expect(addBtn).toBeDisabled();
    });

    it('muestra EmptyState con botón "Explorar catálogo" cuando no hay favoritos', async () => {
      vi.spyOn(favoritesApi, 'getFavoritesApi').mockResolvedValue([]);

      renderWithProviders(
        <Routes>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/" element={<div>Página de Catálogo</div>} />
        </Routes>,
        { route: '/favorites' },
      );

      expect(await screen.findByText('Aún no tienes favoritos')).toBeInTheDocument();
      expect(screen.getByText('Marca productos con el corazón para encontrarlos aquí.')).toBeInTheDocument();

      const exploreBtn = screen.getByRole('button', { name: /explorar catálogo/i });
      fireEvent.click(exploreBtn);

      expect(await screen.findByText('Página de Catálogo')).toBeInTheDocument();
    });

    it('muestra ErrorState y botón de reintentar si el API de favoritos falla', async () => {
      vi.spyOn(favoritesApi, 'getFavoritesApi').mockRejectedValue(
        new Error('Error de red al cargar favoritos'),
      );

      renderWithProviders(<FavoritesPage />);

      expect(await screen.findByText('Error de red al cargar favoritos')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });
});
