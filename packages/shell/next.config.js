const createNextIntlPlugin = require('next-intl/plugin');

/**
 * next-intl plugin wraps Next.js config to enable the App Router integration.
 *
 * The plugin reads the request config from `src/i18n.ts` by convention.
 * See: https://next-intl.dev/docs/getting-started/app-router
 */
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vastu/shared', '@vastu/workspace'],
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // output: 'standalone', // Uncomment for Docker deployment
};

module.exports = withNextIntl(nextConfig);
