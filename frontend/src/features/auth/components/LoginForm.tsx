import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { ApiError } from '../../../api/apiClient.js';
import { Button } from '../../../components/ui/Button.js';
import { getErrorMessage } from '../../../lib/errors.js';
import { useLogin } from '../hooks/useLogin.js';
import type { FormErrors } from '../types/index.js';

interface LoginFormProps {
  emailValue?: string;
  passwordValue?: string;
  onValuesChange?: (email: string, pass: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  emailValue = '',
  passwordValue = '',
  onValuesChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending } = useLogin();

  const [email, setEmail] = useState(emailValue);
  const [password, setPassword] = useState(passwordValue);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Sincronizar props con estado si cambian por demo selector
  useEffect(() => {
    if (emailValue !== undefined) setEmail(emailValue);
  }, [emailValue]);

  useEffect(() => {
    if (passwordValue !== undefined) setPassword(passwordValue);
  }, [passwordValue]);

  // Foco inicial en email
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Verificar si viene de una redirección por sesión expirada
  const locationState = location.state as { from?: { pathname?: string }; expired?: boolean } | null;
  const isSessionExpired = locationState?.expired;
  const from = locationState?.from?.pathname || '/';

  const validateClient = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);

    if (newErrors.email) {
      emailRef.current?.focus();
      return false;
    }
    if (newErrors.password) {
      passwordRef.current?.focus();
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateClient()) return;

    login(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          navigate(from, { replace: true });
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === 'INVALID_CREDENTIALS') {
              setErrors({ general: 'Correo o contraseña incorrectos' });
              setPassword('');
              onValuesChange?.(email, '');
              passwordRef.current?.focus();
              return;
            }

            if (err.code === 'VALIDATION_ERROR' && err.details) {
              const fieldErrors: FormErrors = {};
              for (const detail of err.details) {
                if (detail.field === 'email') fieldErrors.email = detail.message;
                if (detail.field === 'password') fieldErrors.password = detail.message;
              }
              setErrors(fieldErrors);
              if (fieldErrors.email) emailRef.current?.focus();
              else if (fieldErrors.password) passwordRef.current?.focus();
              return;
            }
          }

          setErrors({ general: getErrorMessage(err) });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {isSessionExpired && (
        <div
          role="status"
          className="p-3.5 bg-tertiary/15 border border-tertiary/30 rounded-[var(--radius-field)] text-primary text-xs font-medium"
        >
          Tu sesión expiró. Inicia sesión de nuevo.
        </div>
      )}

      {errors.general && (
        <div
          role="alert"
          className="p-3.5 bg-error/10 border border-error/20 rounded-[var(--radius-field)] text-error text-xs font-medium"
        >
          {errors.general}
        </div>
      )}

      {/* Campo Correo */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-primary mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
            <Mail size={18} aria-hidden="true" />
          </div>
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onValuesChange?.(e.target.value, password);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="ejemplo@tienda.co"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`w-full pl-10 pr-4 py-2.5 bg-neutral border rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:ring-1 transition-colors text-sm ${
              errors.email
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-tertiary/40 focus:border-secondary focus:ring-secondary'
            }`}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-error">
            {errors.email}
          </p>
        )}
      </div>

      {/* Campo Contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-primary mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tertiary">
            <Lock size={18} aria-hidden="true" />
          </div>
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onValuesChange?.(email, e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`w-full pl-10 pr-10 py-2.5 bg-neutral border rounded-[var(--radius-field)] text-primary placeholder:text-primary/40 focus:ring-1 transition-colors text-sm ${
              errors.password
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-tertiary/40 focus:border-secondary focus:ring-secondary'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary/40 hover:text-primary transition-colors cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-error">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" fullWidth loading={isPending} className="mt-2">
        Ingresar
      </Button>
    </form>
  );
};
