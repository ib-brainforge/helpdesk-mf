import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app's @/ alias, and JSX compiled here because tsconfig preserves it
  // for the bundler.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  oxc: { jsx: { runtime: 'automatic' } },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
