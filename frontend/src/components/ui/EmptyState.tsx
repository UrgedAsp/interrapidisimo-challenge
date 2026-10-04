import React, { type ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-neutral border border-tertiary/30 rounded-[var(--radius-card)] my-4 ${className}`}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-tertiary/20 text-secondary mb-4">
        {icon ?? <PackageOpen size={28} aria-hidden="true" />}
      </div>
      <h3 className="text-xl font-semibold text-primary mb-2 font-headline">{title}</h3>
      {description && <p className="text-primary/70 max-w-md mb-6">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
