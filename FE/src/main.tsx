import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient.ts'

// SECURITY/PRIVACY: jangan bocorkan response/payload/data ke console di
// production. Di production, netralkan log verbose (tetap pertahankan
// error/warn untuk debugging nyata).
if (!import.meta.env.DEV) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

// Clear old localStorage mock data - we're now using real API
if (localStorage.getItem('localGedung')) {
  localStorage.removeItem('localGedung');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
