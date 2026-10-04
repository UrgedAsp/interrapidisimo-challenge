import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renderiza el shell con los tokens de §8', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Andamiaje listo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Botón de acción destacada/ })).toBeInTheDocument();
  });
});