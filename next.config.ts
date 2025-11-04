import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["node-cron"],
    instrumentationHook: true
  }
};

export default nextConfig;
