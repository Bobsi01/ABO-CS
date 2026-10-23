import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Keep the map and 3D dependencies independently cacheable. Split
              // Three's core from its WebGL renderer without eager app imports.
              { name: 'three-core', test: /three[\\/]build[\\/]three\.core\.js/ },
              { name: 'three-webgl', test: /three[\\/]build[\\/]three\.module\.js/ },
              { name: 'map-vendor', test: /node_modules[\\/]leaflet[\\/]/ },
            ],
          },
        },
      },
    },
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
      testTimeout: 30000,
    },
  }
})
