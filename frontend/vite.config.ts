import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Pin mock mode for tests so the suite is deterministic regardless of a
    // developer's .env.local (which may point the app at a real backend).
    // Real-mode API tests opt out per-file with vi.stubEnv.
    env: { VITE_USE_MOCKS: 'true' },
  },
});
