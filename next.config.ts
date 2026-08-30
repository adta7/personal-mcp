import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Turbopack walks up past the repo and finds a
  // stray package-lock.json in the home directory, then warns and guesses. Being explicit
  // makes local builds and CI resolve identically.
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
