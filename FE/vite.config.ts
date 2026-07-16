import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'https://stylar-nonseverable-denver.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
          });
        },
      },
      '/ws': {
        target: process.env.VITE_WS_TARGET || 'wss://stylar-nonseverable-denver.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
