import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8888",
      },
      {
        protocol: "http",
        hostname: "134.209.229.141",
      },
      {
        protocol: "https",
        hostname: "texto.life",
      },
      {
        protocol: "https",
        hostname: "www.texto.life",
      },
      {
        protocol: "https",
        hostname: "134.209.229.141",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    const api =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888/api/v1";
    return [
      {
        source: "/api/:path*",
        destination: `${api}/:path*`,
      },
    ];
  },
};

export default nextConfig;
