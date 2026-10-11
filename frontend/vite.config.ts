import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: environment.ABO_API_TARGET || 'http://127.0.0.1:8000' },
        '/documentation': { target: environment.ABO_API_TARGET || 'http://127.0.0.1:8000' },
      },
    },
    test: {
      environment: 'jsdom',
      clearMocks: true,
      restoreMocks: true,
    },
  }
})
