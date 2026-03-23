import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'prisma/__tests__/**',
        'src/__tests__/**',
        'prisma/seed.ts',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});
