import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App.js';

describe('App Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renderiza la pantalla de inicio de sesión cuando no hay sesión activa', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Interrápido Store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});