import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, LogOut, Menu, ShoppingBag, Sparkles, Store, X } from 'lucide-react';
import { formatPoints } from '../../lib/format.js';
import { useAuth } from '../../features/auth/hooks/useAuth.js';
import { useCart } from '../../features/cart/hooks/useCart.js';

interface HeaderProps {
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart }) => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const itemCount = cart?.itemCount ?? 0;
  const points = user?.pointsBalance ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-neutral/95 backdrop-blur-sm border-b border-tertiary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-primary font-headline text-xl font-bold tracking-tight hover:opacity-90 transition-opacity"
            >
              <Store size={24} className="text-secondary" aria-hidden="true" />
              <span>Interrápido Store</span>
            </Link>

            {/* Navegación Desktop */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
              <Link
                to="/"
                className={`px-3 py-2 rounded-[var(--radius-field)] text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'text-secondary font-semibold bg-secondary/10'
                    : 'text-primary/70 hover:text-primary hover:bg-tertiary/10'
                }`}
              >
                Catálogo
              </Link>
              <Link
                to="/favorites"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-field)] text-sm font-medium transition-colors ${
                  isActive('/favorites')
                    ? 'text-secondary font-semibold bg-secondary/10'
                    : 'text-primary/70 hover:text-primary hover:bg-tertiary/10'
                }`}
              >
                <Heart size={16} aria-hidden="true" />
                Favoritos
              </Link>
            </nav>
          </div>

          {/* Acciones del Header */}
          <div className="flex items-center gap-3">
            {/* Indicador de Puntos */}
            <div
              className="flex items-center gap-1.5 bg-tertiary/15 border border-tertiary/30 text-primary px-3 py-1.5 rounded-full text-sm font-medium shadow-xs"
              aria-label={`Tienes ${points} puntos de recompensa`}
            >
              <Sparkles size={16} className="text-secondary" aria-hidden="true" />
              <span className="font-semibold text-secondary">{formatPoints(points)}</span>
              <span className="text-xs text-primary/70 hidden sm:inline">pts</span>
            </div>

            {/* Botón Carrito */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Carrito de compras con ${itemCount} productos`}
              className="relative p-2.5 text-primary hover:text-secondary rounded-[var(--radius-field)] hover:bg-tertiary/10 transition-colors cursor-pointer focus-visible:outline-secondary"
            >
              <ShoppingBag size={22} aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-neutral bg-secondary rounded-full px-1 shadow-xs animate-in zoom-in-50 duration-200">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Botón Salir Desktop */}
            <button
              type="button"
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="hidden md:flex items-center gap-1 p-2 text-primary/60 hover:text-error rounded-[var(--radius-field)] hover:bg-error/10 transition-colors cursor-pointer focus-visible:outline-error"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>

            {/* Botón Menú Móvil */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="md:hidden p-2 text-primary hover:text-secondary rounded-[var(--radius-field)] hover:bg-tertiary/10 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Menú Móvil Desplegable */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-tertiary/20 flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-[var(--radius-field)] text-sm font-medium ${
                isActive('/') ? 'text-secondary font-semibold bg-secondary/10' : 'text-primary'
              }`}
            >
              Catálogo
            </Link>
            <Link
              to="/favorites"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-field)] text-sm font-medium ${
                isActive('/favorites') ? 'text-secondary font-semibold bg-secondary/10' : 'text-primary'
              }`}
            >
              <Heart size={16} aria-hidden="true" />
              Favoritos
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-field)] text-sm font-medium text-error hover:bg-error/10 text-left mt-2 border-t border-tertiary/10 pt-2"
            >
              <LogOut size={16} aria-hidden="true" />
              Cerrar sesión ({user?.name ?? 'Usuario'})
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
