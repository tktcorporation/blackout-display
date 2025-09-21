/**
 * vitest.config.ts
 * 
 * Purpose: Configuration for Vitest testing framework
 * 
 * This configuration:
 * - Sets up testing environment for TypeScript and React
 * - Configures happy-dom for browser-like environment
 * - Defines test file patterns and paths
 * - Integrates with Vite for module resolution
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});