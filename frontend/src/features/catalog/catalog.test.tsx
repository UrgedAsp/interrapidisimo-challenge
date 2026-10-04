import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import type { ApiList, Category, Product } from '../../types/api.js';
import * as catalogApi from './api/catalogApi.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { ProductCard } from './components/ProductCard.js';
import { Pagination } from './components/Pagination.js';
import { ToastProvider } from '../../components/ui/Toast.js';
import { AuthProvider } from '../auth/AuthProvider.js';

const mockCategories: Category[] = [
  { id: 1, name: 'Tecnología', slug: 'tecnologia' },
  { id: 2, name: 'Ropa', slug: 'ropa' },
];

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Auriculares Bluetooth',
    price: 150000,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    category: { id: 1, name: 'Tecnología', slug: 'tecnologia' },
    isFavorite: false,
  },
  {
    id: 2,
    name: 'Camiseta de Algodón',
    price: 45000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
    category: { id: 2, name: 'Ropa', slug: 'ropa' },
    isFavorite: true,
  },
  {
    id: 3,
    name: 'Teclado Mecánico',
    price: 220000,
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    category: { id: 1, name: 'Tecnología', slug: 'tecnologia' },
    isFavorite: false,
  },
];

const mockPaginatedResponse: ApiList<Product> = {
  data: mockProducts,
  meta: {
    page: 1,
    pageSize: 12,
    total: 3,
    totalPages: 1,
  },
};

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
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Catalog Feature (§12 de 20-frontend-catalog.md)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(catalogApi, 'getCategoriesApi').mockResolvedValue(mockCategories);
    vi.spyOn(catalogApi, 'getProductsApi').mockResolvedValue(mockPaginatedResponse);
  });

  describe('Filtros y URL', () => {
    it('muestra los productos y categorías obtenidos del API sin nada escrito a mano', async () => {
      renderWithProviders(<CatalogPage />);

      expect(await screen.findByText('Auriculares Bluetooth')).toBeInTheDocument();
      expect(screen.getByText('Camiseta de Algodón')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tecnología' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ropa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    });

    it('al hacer clic en una categoría se llama al API con category slug', async () => {
      const getProductsSpy = vi.spyOn(catalogApi, 'getProductsApi');
      renderWithProviders(<CatalogPage />);

      await screen.findByText('Auriculares Bluetooth');
      const ropaBtn = screen.getByRole('button', { name: 'Ropa' });
      fireEvent.click(ropaBtn);

      await waitFor(() => {
        expect(getProductsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'ropa', page: 1 }),
          expect.anything(),
        );
      });
    });

    it('la paginación conserva los filtros y se oculta con totalPages <= 1', () => {
      renderWithProviders(
        <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
      );
      expect(screen.queryByRole('navigation', { name: /paginación/i })).not.toBeInTheDocument();
    });

    it('la paginación deshabilita Anterior en página 1 y Siguiente en la última página', () => {
      const handlePageChange = vi.fn();
      renderWithProviders(
        <Pagination page={1} totalPages={3} onPageChange={handlePageChange} />,
      );

      const prevBtn = screen.getByRole('button', { name: /anterior/i });
      const nextBtn = screen.getByRole('button', { name: /siguiente/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      fireEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Buscador', () => {
    it('Enter busca de inmediato sin esperar el debounce', async () => {
      const getProductsSpy = vi.spyOn(catalogApi, 'getProductsApi');
      renderWithProviders(<CatalogPage />);

      await screen.findByText('Auriculares Bluetooth');
      const searchInput = screen.getByRole('searchbox', { name: /buscar productos/i });

      fireEvent.change(searchInput, { target: { value: 'reloj' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(getProductsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'reloj', page: 1 }),
          expect.anything(),
        );
      });
    });

    it('el botón de borrar limpia el input y la búsqueda al instante', async () => {
      const getProductsSpy = vi.spyOn(catalogApi, 'getProductsApi');
      renderWithProviders(<CatalogPage />, { route: '/?q=teclado' });

      await screen.findByText('Auriculares Bluetooth');
      const clearBtn = screen.getByRole('button', { name: /borrar búsqueda/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(getProductsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ q: undefined, page: 1 }),
          expect.anything(),
        );
      });
    });
  });

  describe('Estados de la cuadrícula', () => {
    it('muestra ErrorState y botón de Reintentar si el API de productos falla', async () => {
      vi.spyOn(catalogApi, 'getProductsApi').mockRejectedValueOnce(
        new Error('Error de conexión con el servidor'),
      );

      renderWithProviders(<CatalogPage />);

      expect(await screen.findByText('Error de conexión con el servidor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('muestra EmptyState con botón "Limpiar filtros" cuando no hay resultados con filtros activos', async () => {
      vi.spyOn(catalogApi, 'getProductsApi').mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      });

      renderWithProviders(<CatalogPage />, { route: '/?q=inexistente' });

      expect(await screen.findByText('No encontramos productos')).toBeInTheDocument();
      expect(screen.getByText(/no hay resultados para "inexistente"/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /limpiar filtros/i })).toBeInTheDocument();
    });

    it('si falla la carga de categorías, los productos se muestran normalmente', async () => {
      vi.spyOn(catalogApi, 'getCategoriesApi').mockRejectedValue(new Error('Fallo categorías'));

      renderWithProviders(<CatalogPage />);

      expect(await screen.findByText('Auriculares Bluetooth')).toBeInTheDocument();
      expect(screen.getByText('No se pudieron cargar las categorías.')).toBeInTheDocument();
    });
  });

  describe('Tarjeta de Producto (ProductCard)', () => {
    it('muestra precio formateado en COP, categoría y nombre', () => {
      renderWithProviders(<ProductCard product={mockProducts[0]!} />);

      expect(screen.getByText('Auriculares Bluetooth')).toBeInTheDocument();
      expect(screen.getByText(/tecnología/i)).toBeInTheDocument();
      expect(screen.getByText('$ 150.000')).toBeInTheDocument();
    });

    it('con stock 0 muestra insignia "Agotado" y deshabilita el botón de agregar', () => {
      renderWithProviders(<ProductCard product={mockProducts[2]!} />);

      expect(screen.getAllByText(/agotado/i).length).toBeGreaterThanOrEqual(1);
      const addBtn = screen.getByRole('button', { name: /teclado mecánico agotado/i });
      expect(addBtn).toBeDisabled();
    });

    it('con stock <= 5 muestra "Últimas N unidades"', () => {
      renderWithProviders(<ProductCard product={mockProducts[1]!} />);

      expect(screen.getByText('Últimas 3 unidades')).toBeInTheDocument();
    });
  });
});
