import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build runs from GitHub Pages (/ashfall/) or a domain root.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
