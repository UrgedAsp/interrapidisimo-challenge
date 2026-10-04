import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LucideProvider } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el nodo #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LucideProvider size={20} strokeWidth={1.5}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LucideProvider>
    </QueryClientProvider>
  </StrictMode>,
);