/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vastu/shared', '@vastu/workspace', '@vastu/shell'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001'],
    },
  },
};

export default nextConfig;
