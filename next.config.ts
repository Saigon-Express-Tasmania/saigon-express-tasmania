import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  async redirects() {
    return [
      { source: "/en-US", destination: "/", permanent: true },
      { source: "/en-US/:path*", destination: "/:path*", permanent: true },
      { source: "/vi-VN", destination: "/vi", permanent: true },
      { source: "/vi-VN/:path*", destination: "/vi/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2xsxph8kpxj0f.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "**.storage.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "saigonexpresstasmania.com",
        pathname: "/manus-storage/**",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/admin/**",
          "**/scripts/**",
          "**/supabase/**",
          "**/refs/**",
        ],
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
