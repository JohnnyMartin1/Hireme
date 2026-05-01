/** @type {import('next').NextConfig} */
const nextConfig = {
  // Custom distDir (see `outputDirectory` in vercel.json). Default `.next` can be unstable on some local disks.
  distDir: "build",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};
module.exports = nextConfig;
