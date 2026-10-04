import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { DemoUsers } from '../components/DemoUsers.js';
import { LoginForm } from '../components/LoginForm.js';
import { useAuth } from '../hooks/useAuth.js';
import type { DemoUser } from '../types/index.js';

export const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSelectDemo = (user: DemoUser) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral">
      <div className="w-full max-w-md bg-neutral border border-tertiary/30 rounded-[var(--radius-card)] p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 text-secondary mb-3">
            <Sparkles size={24} aria-hidden="true" />
          </div>
          <p className="text-xs uppercase tracking-widest font-semibold text-tertiary">
            Interrapidisimo Store
          </p>
          <h1 className="text-3xl font-bold text-primary font-headline mt-1">Inicia sesión</h1>
          <p className="text-primary/70 mt-1 text-sm">
            Accede a tu cuenta para acumular puntos y comprar
          </p>
        </div>

        <LoginForm
          emailValue={email}
          passwordValue={password}
          onValuesChange={(em, pass) => {
            setEmail(em);
            setPassword(pass);
          }}
        />

        <DemoUsers onSelect={handleSelectDemo} />
      </div>
    </div>
  );
};
