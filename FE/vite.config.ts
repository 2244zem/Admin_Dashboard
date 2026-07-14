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
        target: 'https://stylar-nonseverable-denver.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/ws': {
        target: 'wss://stylar-nonseverable-denver.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        ws: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
})
