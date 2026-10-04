import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ApiError } from '../../api/apiClient.js';
import * as authApi from './api/authApi.js';
import { AuthProvider } from './AuthProvider.js';
import { LoginForm } from './components/LoginForm.js';
import { PointsBadge } from './components/PointsBadge.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('Auth Feature (§5 y §8 de 20-frontend-auth.md)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('el formulario muestra errores de validación en cliente y no llama al API si los datos son inválidos', async () => {
    const loginSpy = vi.spyOn(authApi, 'loginApi');
    renderWithProviders(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /ingresar/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('El correo electrónico es requerido')).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();

    // Con email inválido
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    fireEvent.change(emailInput, { target: { value: 'invalido' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('INVALID_CREDENTIALS muestra mensaje general y vacía el campo de contraseña', async () => {
    vi.spyOn(authApi, 'loginApi').mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos'),
    );

    renderWithProviders(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const submitBtn = screen.getByRole('button', { name: /ingresar/i });

    fireEvent.change(emailInput, { target: { value: 'ana@tienda.co' } });
    fireEvent.change(passwordInput, { target: { value: 'claveerronea' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect((passwordInput as HTMLInputElement).value).toBe('');
  });

  it('VALIDATION_ERROR con details coloca el mensaje en el campo indicado', async () => {
    vi.spyOn(authApi, 'loginApi').mockRejectedValue(
      new ApiError(422, 'VALIDATION_ERROR', 'Datos inválidos', [
        { field: 'email', message: 'Formato de correo no admitido' },
      ]),
    );

    renderWithProviders(<LoginForm />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const submitBtn = screen.getByRole('button', { name: /ingresar/i });

    fireEvent.change(emailInput, { target: { value: 'ana@tienda.co' } });
    fireEvent.change(passwordInput, { target: { value: 'ClaveDemo123' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Formato de correo no admitido')).toBeInTheDocument();
  });

  it('ProtectedRoute no renderiza contenido protegido si no hay token', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Contenido Secreto</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Página de Login</div>} />
      </Routes>,
    );

    expect(screen.queryByText('Contenido Secreto')).not.toBeInTheDocument();
    expect(screen.getByText('Página de Login')).toBeInTheDocument();
  });

  it('PointsBadge muestra el saldo formateado cuando useMe responde con éxito', async () => {
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue({
      id: 1,
      name: 'Ana',
      email: 'ana@tienda.co',
      pointsBalance: 1250,
    });
    window.localStorage.setItem('interrapidisimo.token', 'test-token');

    renderWithProviders(<PointsBadge />);

    expect(await screen.findByText('1.250')).toBeInTheDocument();
  });
});
