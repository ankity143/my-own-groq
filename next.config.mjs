/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server action & proxy limits for BYOK vision images
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

