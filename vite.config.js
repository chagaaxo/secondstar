import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false, // Add this for local development
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Modified rewrite
        ws: true // Enable WebSockets if needed
      }
    }
  }
})