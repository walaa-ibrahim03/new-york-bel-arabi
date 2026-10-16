import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: { bodySizeLimit: '3mb' },
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,

};

export default nextConfig;
