import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '../../lib/errors.js';
import { Button } from './Button.js';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title = 'Ocurrió un problema',
  message,
  onRetry,
  className = '',
}) => {
  const displayMessage = message ?? (error ? getErrorMessage(error) : 'No pudimos cargar la información.');

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center bg-neutral border border-error/20 rounded-[var(--radius-card)] my-4 ${className}`}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-error/10 text-error mb-4">
        <AlertCircle size={28} aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold text-primary mb-2 font-headline">{title}</h3>
      <p className="text-primary/80 max-w-md mb-6">{displayMessage}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </Button>
      )}
    </div>
  );
};
