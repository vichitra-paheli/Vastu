import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Individual test files can override with @vitest-environment docblock
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'prisma/__tests__/**',
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
        // Sub-path imports must be listed BEFORE the bare package alias.
        find: '@vastu/shared/permissions',
        replacement: path.resolve(
          __dirname,
          '../../packages/shared/src/permissions/index.ts',
        ),
      },
      {
        find: '@vastu/shared/utils',
        replacement: path.resolve(__dirname, '../../packages/shared/src/utils/index.ts'),
      },
      {
        find: '@vastu/shared',
        replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
      {
        find: '@vastu/workspace',
        replacement: path.resolve(__dirname, '../../packages/workspace/src/index.ts'),
      },
      {
        // Recharts + d3 exhaust jsdom worker memory. Alias to a lightweight stub.
        find: 'recharts',
        replacement: path.resolve(
          __dirname,
          '../../packages/workspace/src/__mocks__/recharts.tsx',
        ),
      },
    ],
  },
});
