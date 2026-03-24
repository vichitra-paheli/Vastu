import createNextIntlPlugin from 'next-intl/plugin';

/**
 * next-intl plugin wraps Next.js config to enable the App Router integration.
 * The plugin reads the request config from `src/i18n.ts` by convention.
 */
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vastu/shared', '@vastu/workspace', '@vastu/shell'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001'],
    },
  },
};

export default withNextIntl(nextConfig);
