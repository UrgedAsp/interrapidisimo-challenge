import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CartDrawer } from '../../features/cart/components/CartDrawer.js';
import { Header } from './Header.js';

export const AppLayout: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-neutral text-primary">
      <Header onOpenCart={() => setIsCartOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};
