const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
const baseConfig = {
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

module.exports = (phase) => {
  if (phase !== PHASE_DEVELOPMENT_SERVER) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    // Reduce stale-document + stale-buildId mismatches (chunk 404s) during local dev.
    async headers() {
      return [
        {
          source: "/",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, no-cache, must-revalidate, max-age=0",
            },
          ],
        },
        {
          source: "/:path((?!_next/static|_next/image|_next/data|api/).*)",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, no-cache, must-revalidate, max-age=0",
            },
          ],
        },
      ];
    },
  };
};
