/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vastu/shared'],
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // output: 'standalone', // Uncomment for Docker deployment
};

module.exports = nextConfig;
