import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { ApiError } from '../../api/apiClient.js';
import { ToastProvider } from '../../components/ui/Toast.js';
import type { Cart, CheckoutResult, Product } from '../../types/api.js';
import { AuthProvider } from '../auth/AuthProvider.js';
import * as cartApi from './api/cartApi.js';
import { CartDrawerProvider, useCartDrawer } from './CartDrawerProvider.js';
import { AddToCartButton } from './components/AddToCartButton.js';
import { CartButton } from './components/CartButton.js';
import { CartDrawer } from './components/CartDrawer.js';
import { QuantityStepper } from './components/QuantityStepper.js';

const mockCart: Cart = {
  id: 1,
  items: [
    {
      productId: 10,
      name: 'Café Especial',
      price: 25000,
      imageUrl: 'https://images.unsplash.com/cafe.jpg',
      quantity: 2,
      stock: 5,
      subtotal: 50000,
    },
    {
      productId: 20,
      name: 'Mug Cerámica',
      price: 15000,
      imageUrl: 'https://images.unsplash.com/mug.jpg',
      quantity: 1,
      stock: 10,
      subtotal: 15000,
    },
  ],
  itemCount: 3,
  total: 65000,
};

const mockProduct: Product = {
  id: 10,
  name: 'Café Especial',
  price: 25000,
  imageUrl: 'https://images.unsplash.com/cafe.jpg',
  stock: 5,
  category: { id: 1, name: 'Bebidas', slug: 'bebidas' },
  isFavorite: false,
};

const mockCheckoutResult: CheckoutResult = {
  order: {
    id: 101,
    total: 65000,
    createdAt: '2026-01-01T00:00:00.000Z',
    items: [
      {
        productId: 10,
        name: 'Café Especial',
        quantity: 2,
        unitPrice: 25000,
      },
      {
        productId: 20,
        name: 'Mug Cerámica',
        quantity: 1,
        unitPrice: 15000,
      },
    ],
  },
  pointsAwarded: 75,
  pointsBalance: 175,
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
          <CartDrawerProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </CartDrawerProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

// Componente helper para probar abrir el drawer
const TestCartContainer: React.FC = () => {
  const { openCart } = useCartDrawer();
  return (
    <div>
      <button type="button" onClick={openCart}>
        Abrir panel
      </button>
      <CartButton />
      <CartDrawer />
    </div>
  );
};

describe('Cart Feature (§11 de 20-frontend-cart.md)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('interrapidisimo.token', 'test-token');
    vi.restoreAllMocks();
    vi.spyOn(cartApi, 'getCartApi').mockResolvedValue(mockCart);
  });

  describe('Insignia y Botón de Carrito', () => {
    it('muestra el número de unidades en la insignia del CartButton', async () => {
      renderWithProviders(<CartButton />);

      expect(await screen.findByText('3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /carrito de compras con 3 productos/i })).toBeInTheDocument();
    });

    it('la insignia se oculta si itemCount es 0', async () => {
      vi.spyOn(cartApi, 'getCartApi').mockResolvedValue({
        id: 1,
        items: [],
        itemCount: 0,
        total: 0,
      });

      renderWithProviders(<CartButton />);

      await screen.findByRole('button', { name: /carrito de compras con 0 productos/i });
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('AddToCartButton', () => {
    it('muestra "Agotado" y está deshabilitado si stock === 0', () => {
      renderWithProviders(
        <AddToCartButton
          productId={99}
          productName="Producto Agotado"
          stock={0}
        />,
      );

      const btn = screen.getByRole('button', { name: /producto agotado agotado/i });
      expect(btn).toBeDisabled();
      expect(screen.getByText('Agotado')).toBeInTheDocument();
    });

    it('muestra "Máximo en el carrito" cuando la cantidad en el carrito alcanza el stock', async () => {
      // mockCart tiene 2 unidades de Café Especial (stock = 2)
      vi.spyOn(cartApi, 'getCartApi').mockResolvedValue({
        id: 1,
        items: [
          {
            productId: 10,
            name: 'Café Especial',
            price: 25000,
            imageUrl: '',
            quantity: 2,
            stock: 2,
            subtotal: 50000,
          },
        ],
        itemCount: 2,
        total: 50000,
      });

      renderWithProviders(
        <AddToCartButton
          productId={10}
          productName="Café Especial"
          stock={2}
        />,
      );

      expect(await screen.findByText('Máximo en el carrito')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /máximo de café especial alcanzado en el carrito/i });
      expect(btn).toBeDisabled();
    });

    it('al hacer clic llama a addCartItemApi con quantity 1', async () => {
      const addSpy = vi.spyOn(cartApi, 'addCartItemApi').mockResolvedValue({
        ...mockCart,
        itemCount: 4,
      });

      renderWithProviders(
        <AddToCartButton
          productId={mockProduct.id}
          productName={mockProduct.name}
          stock={mockProduct.stock}
          product={mockProduct}
        />,
      );

      const btn = await screen.findByRole('button', { name: /agregar café especial al carrito/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith(10, 1);
      });
    });
  });

  describe('QuantityStepper', () => {
    it('el botón menos se deshabilita en 1 y más en el stock máximo', () => {
      const handleQuantityChange = vi.fn();
      renderWithProviders(
        <QuantityStepper
          productId={10}
          productName="Café Especial"
          quantity={1}
          stock={5}
          onQuantityChange={handleQuantityChange}
        />,
      );

      const minusBtn = screen.getByRole('button', { name: /disminuir cantidad de café especial, actual 1/i });
      const plusBtn = screen.getByRole('button', { name: /aumentar cantidad de café especial, actual 1/i });

      expect(minusBtn).toBeDisabled();
      expect(plusBtn).not.toBeDisabled();

      fireEvent.click(plusBtn);
      expect(handleQuantityChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Panel del Carrito (CartDrawer)', () => {
    it('muestra los productos del carrito con sus subtotales y total', async () => {
      renderWithProviders(<TestCartContainer />);

      // Abrir el drawer
      fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }));

      expect(await screen.findByText('Café Especial')).toBeInTheDocument();
      expect(screen.getByText('Tu carrito')).toBeInTheDocument();
      expect(screen.getByText('Mug Cerámica')).toBeInTheDocument();
      expect(screen.getByText('$ 65.000')).toBeInTheDocument();
    });

    it('muestra EmptyState cuando el carrito está vacío', async () => {
      vi.spyOn(cartApi, 'getCartApi').mockResolvedValue({
        id: 1,
        items: [],
        itemCount: 0,
        total: 0,
      });

      renderWithProviders(<TestCartContainer />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }));

      expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /explorar productos/i })).toBeInTheDocument();
    });

    it('permite quitar un producto llamando a removeCartItemApi', async () => {
      const removeSpy = vi.spyOn(cartApi, 'removeCartItemApi').mockResolvedValue({
        id: 1,
        items: [mockCart.items[1]!],
        itemCount: 1,
        total: 15000,
      });

      renderWithProviders(<TestCartContainer />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }));

      const removeBtn = await screen.findByRole('button', { name: /quitar café especial del carrito/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith(10);
      });
    });
  });

  describe('Checkout y Confirmación', () => {
    it('un checkout exitoso muestra OrderConfirmation con orden, total y puntos', async () => {
      const checkoutSpy = vi.spyOn(cartApi, 'checkoutApi').mockResolvedValue(mockCheckoutResult);

      renderWithProviders(<TestCartContainer />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }));

      const checkoutBtn = await screen.findByRole('button', { name: /finalizar compra/i });
      fireEvent.click(checkoutBtn);

      expect(await screen.findByText('¡Compra realizada!')).toBeInTheDocument();
      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText('+75')).toBeInTheDocument();
      expect(screen.getByText('175')).toBeInTheDocument();
      expect(checkoutSpy).toHaveBeenCalled();
    });

    it('OUT_OF_STOCK en checkout muestra mensaje de error sin pasar a confirmación', async () => {
      vi.spyOn(cartApi, 'checkoutApi').mockRejectedValue(
        new ApiError(409, 'OUT_OF_STOCK', 'Stock insuficiente', [
          { productId: 10, message: 'Café Especial solo tiene 1 unidad disponible' },
        ]),
      );

      renderWithProviders(<TestCartContainer />);
      fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }));

      const checkoutBtn = await screen.findByRole('button', { name: /finalizar compra/i });
      fireEvent.click(checkoutBtn);

      expect(await screen.findByText('Algunos productos ya no tienen stock suficiente.')).toBeInTheDocument();
      expect(screen.getByText('Café Especial solo tiene 1 unidad disponible')).toBeInTheDocument();
      expect(screen.queryByText('¡Compra realizada!')).not.toBeInTheDocument();
    });
  });
});
