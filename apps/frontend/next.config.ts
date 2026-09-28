import type { NextConfig } from "next";

// The browser talks to /api on this app's own origin and Next forwards it to the backend.
// That keeps the auth cookies first-party (browsers increasingly block third-party cookies).
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Lets a second instance (e.g. a test server) build into its own folder without clobbering `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
