import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./apps/web/src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      // Playwright specs live next to Vitest specs; they must run via `playwright test`.
      '**/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@bus/db': path.resolve(__dirname, './packages/db/src'),
      '@bus/ui': path.resolve(__dirname, './packages/ui/src'),
      '@bus/validators': path.resolve(__dirname, './packages/validators/src'),
    },
  },
});
