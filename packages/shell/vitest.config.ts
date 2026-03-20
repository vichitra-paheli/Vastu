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
    exclude: ['e2e/**', 'node_modules/**'],
    fakeTimers: {
      // Only fake Date by default; exclude setTimeout/setInterval so that
      // userEvent interactions don't hang when vi.useFakeTimers() is called.
      // Tests that need timer control use vi.advanceTimersByTime() which
      // works with real timers via waitFor polling.
      toFake: ['Date'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'e2e/**',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@vastu/shared/prisma', replacement: path.resolve(__dirname, '../shared/src/prisma/index.ts') },
      { find: '@vastu/shared/permissions', replacement: path.resolve(__dirname, '../shared/src/permissions/index.ts') },
      { find: '@vastu/shared/types', replacement: path.resolve(__dirname, '../shared/src/types/index.ts') },
      { find: '@vastu/shared/utils', replacement: path.resolve(__dirname, '../shared/src/utils/index.ts') },
      { find: '@vastu/shared', replacement: path.resolve(__dirname, '../shared/src/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
