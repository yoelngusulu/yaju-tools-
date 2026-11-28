import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/tools/gis/bearing-azimuth-calculator",
        destination: "/tools/gis/distance-area-calculator",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "docmaster-pro-lemon.vercel.app",
          },
        ],
        destination: "https://yaju-tools.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
