import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    passWithNoTests: true,
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: '@vastu/shared',
        replacement: path.resolve(__dirname, '../shared/src/index.ts'),
      },
      {
        find: '@vastu/workspace',
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
    ],
  },
});
