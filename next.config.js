/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // add image domains here if you ever load remote images:
  images: { 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ] 
  },
  // Ignore build errors during deployment for now
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
