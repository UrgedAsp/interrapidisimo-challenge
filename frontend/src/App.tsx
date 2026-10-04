import { Package } from 'lucide-react';

const SWATCHES = [
  { label: 'primary', swatch: 'bg-primary' },
  { label: 'secondary', swatch: 'bg-secondary' },
  { label: 'tertiary', swatch: 'bg-tertiary' },
  { label: 'neutral', swatch: 'bg-neutral' },
  { label: 'success', swatch: 'bg-success' },
  { label: 'error', swatch: 'bg-error' },
] as const;

export default function App() {
  return (
    <main className="min-h-dvh bg-neutral px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-headline text-3xl font-semibold text-primary sm:text-4xl">
            Andamiaje listo
          </h1>
          <p className="font-sans text-base text-primary/70">
            React, Vite, Tailwind y TanStack Query conectados. El catálogo, el carrito y los
            favoritos llegan con sus specs.
          </p>
        </header>

        <section className="rounded-card border border-tertiary bg-neutral p-4">
          <h2 className="font-headline text-lg font-medium text-primary">Tokens de §8</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SWATCHES.map(({ label, swatch }) => (
              <li key={label} className="flex items-center gap-2">
                <span className={`size-6 rounded-field border border-tertiary ${swatch}`} />
                <span className="text-sm text-primary/80">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-field bg-secondary px-4 py-2 font-sans text-base font-semibold text-neutral hover:opacity-90"
        >
          <Package aria-hidden />
          Botón de acción destacada
        </button>
      </div>
    </main>
  );
}