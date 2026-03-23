import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
    proxy: {
      '/api': 'http://localhost:9010',
      '/v1': 'http://localhost:9010',
      '/health': 'http://localhost:9010',
      '/docs': 'http://localhost:9010',
      '/openapi.json': 'http://localhost:9010',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
