/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vastu/shared'],
  // Prevent Next.js from bundling Prisma for Edge Runtime (middleware).
  // Without this, PrismaAdapter fails in middleware with:
  //   "PrismaClient is not configured to run in Edge Runtime"
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // output: 'standalone', // Uncomment for Docker deployment
};

module.exports = nextConfig;
