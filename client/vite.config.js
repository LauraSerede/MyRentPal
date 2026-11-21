import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'react-hot-toast', 'lucide-react'],
  },
  server: {
    port: 3000,
    // Proxy API requests to the backend during development
    // so you can call /api/users instead of http://localhost:5000/api/users
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
