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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vastu/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      '@vastu/shared/prisma': path.resolve(__dirname, '../shared/src/prisma/index.ts'),
      '@vastu/shared/permissions': path.resolve(__dirname, '../shared/src/permissions/index.ts'),
      '@vastu/shared/types': path.resolve(__dirname, '../shared/src/types/index.ts'),
      '@vastu/shared/utils': path.resolve(__dirname, '../shared/src/utils/index.ts'),
    },
  },
});
