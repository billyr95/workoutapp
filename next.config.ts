import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json at the home directory confuses Turbopack's root auto-detection
  // (it walks up looking for a lockfile and finds that one first) — pin it explicitly instead.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
