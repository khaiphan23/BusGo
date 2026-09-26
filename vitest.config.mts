import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./apps/web/src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
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
