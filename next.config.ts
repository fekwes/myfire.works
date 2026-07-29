import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Pin the workspace root to this project.
   *
   * Next infers the root by walking up for lockfiles, and there is a stray
   * `package-lock.json` in the developer's home directory — so it picked
   * `/Users/alberto` and warned on every build. That inference drives output
   * file tracing, which decides what gets bundled into the serverless
   * functions; rooted at a home directory it can trace the wrong tree
   * entirely. Pinning it keeps builds identical wherever they run.
   */
  outputFileTracingRoot: import.meta.dirname,
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
