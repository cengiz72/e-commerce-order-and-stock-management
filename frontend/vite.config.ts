import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Node environment is enough today: the only tests are for the HTTP client, which stubs
    // global fetch and needs no DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
