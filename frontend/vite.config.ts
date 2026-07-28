import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Node stays the default: the HTTP client tests only stub global fetch and need no DOM.
    // React tests (context providers, hooks) opt into jsdom per file with a
    // `// @vitest-environment jsdom` docblock, so they don't slow the rest down.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
