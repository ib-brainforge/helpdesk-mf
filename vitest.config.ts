import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// Same shape as logistics-mf's vitest.config.ts: jsdom + @vitejs/plugin-react
// + @testing-library, with e2e specs excluded.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30_000,
    globals: true,
    server: {
      deps: {
        inline: [/@heroui\/react/, /@brainforgeau\/components/],
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.e2e.*',
      '**/*.spec.*',
      '**/playwright/**',
    ],
    alias: { '@': srcDir },
  },
  resolve: {
    alias: { '@': srcDir },
    conditions: ['import', 'module', 'browser', 'default'],
  },
});
