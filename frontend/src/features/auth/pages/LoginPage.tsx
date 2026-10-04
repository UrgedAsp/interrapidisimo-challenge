import React, { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { getErrorMessage } from '../../../lib/errors.js';
import { useAuth } from '../hooks/useAuth.js';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ruta a la que intentaba acceder antes del redirect
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('ClaveDemo123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral">
      <div className="w-full max-w-md bg-neutral border border-tertiary/30 rounded-[var(--radius-card)] p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 text-secondary mb-3">
            <Sparkles size={24} aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-primary font-headline">Interrápido Store</h1>
          <p className="text-primary/70 mt-1 text-sm">Inicia sesión para acumular puntos y comprar</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-error/10 border border-error/20 rounded-[var(--radius-field)] text-error text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
                <Mail size={18} aria-hidden="true" />
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@tienda.co"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral border border-tertiary/40 rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
                <Lock size={18} aria-hidden="true" />
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral border border-tertiary/40 rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
            Iniciar sesión
          </Button>
        </form>

        {/* Credenciales demo */}
        <div className="mt-8 pt-6 border-t border-tertiary/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3 text-center">
            Usuarios de demostración
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('ana@tienda.co')}
              className="px-3 py-2 text-xs text-center border border-tertiary/30 rounded-[var(--radius-field)] hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer text-primary"
            >
              <span className="font-semibold block">Ana</span>
              <span className="text-primary/60">ana@tienda.co</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('carlos@tienda.co')}
              className="px-3 py-2 text-xs text-center border border-tertiary/30 rounded-[var(--radius-field)] hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer text-primary"
            >
              <span className="font-semibold block">Carlos</span>
              <span className="text-primary/60">carlos@tienda.co</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
