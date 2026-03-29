import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Allow larger multipart form payloads for photo + video uploads
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
