import React from 'react';
import type { DemoUser } from '../types/index.js';

export const DEMO_USERS: DemoUser[] = [
  { name: 'Ana', email: 'ana@tienda.co', password: 'ClaveDemo123' },
  { name: 'Carlos', email: 'carlos@tienda.co', password: 'ClaveDemo123' },
];

interface DemoUsersProps {
  onSelect: (user: DemoUser) => void;
}

export const DemoUsers: React.FC<DemoUsersProps> = ({ onSelect }) => {
  return (
    <div className="mt-8 pt-6 border-t border-tertiary/20">
      <p className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3 text-center">
        Usuarios de demostración
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_USERS.map((user) => (
          <button
            key={user.email}
            type="button"
            onClick={() => onSelect(user)}
            className="px-3 py-2 text-xs text-center border border-tertiary/30 rounded-[var(--radius-field)] hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer text-primary focus-visible:outline-secondary"
          >
            <span className="font-semibold block">{user.name}</span>
            <span className="text-primary/60 block truncate">{user.email}</span>
            <span className="text-[10px] text-secondary mt-0.5 inline-block font-medium">
              Usar credenciales
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
