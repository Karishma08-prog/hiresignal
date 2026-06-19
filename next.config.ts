import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/", headers: noStoreHeaders },
      { source: "/dashboard", headers: noStoreHeaders },
      { source: "/scraper", headers: noStoreHeaders },
      { source: "/campaigns", headers: noStoreHeaders },
      { source: "/companies", headers: noStoreHeaders },
      { source: "/companies/:path*", headers: noStoreHeaders },
      { source: "/campaign-runs/:path*", headers: noStoreHeaders },
      { source: "/job-boards", headers: noStoreHeaders },
      { source: "/reports", headers: noStoreHeaders },
      { source: "/settings", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
