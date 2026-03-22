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
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: [
      {
        // Sub-path imports like '@vastu/shared/permissions' must be listed BEFORE
        // the bare '@vastu/shared' alias so they're matched first.
        find: '@vastu/shared/permissions',
        replacement: path.resolve(__dirname, '../shared/src/permissions/index.ts'),
      },
      {
        find: '@vastu/shared/utils',
        replacement: path.resolve(__dirname, '../shared/src/utils/index.ts'),
      },
      {
        find: '@vastu/shared',
        replacement: path.resolve(__dirname, '../shared/src/index.ts'),
      },
      {
        find: '@vastu/workspace',
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
      {
        // Recharts + d3 exhaust jsdom worker memory.  Alias to a
        // lightweight stub so the real module is never loaded.
        find: 'recharts',
        replacement: path.resolve(__dirname, './src/__mocks__/recharts.tsx'),
      },
    ],
  },
});
