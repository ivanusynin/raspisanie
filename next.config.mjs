/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
    SWC_CACHE: "1",
    WEBPACK_CACHE: "memory",
  },
  async rewrites() {
    return [{ source: "/public/:path*", destination: "/:path*" }];
  },
  async headers() {
    return [
      {
        // Apply to all pages in the app
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Allow any site to embed this page in an <iframe>
            value: "frame-ancestors *;",
          },
          // NOTE: X-Frame-Options is legacy and does not support a wildcard;
          // if your platform injects X-Frame-Options: SAMEORIGIN you may need
          // to remove/override it via platform settings.
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  distDir: ".next",
  trailingSlash: true,
  // Build optimization
  experimental: {
    // Modern experimental features for Next.js 15
  },
  // Cache optimization
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  turbopack: {
    // node_modules is symlinked from /app/base/node_modules into per-branch
    // worktrees. Turbopack validates symlink targets against its filesystem
    // root — set to "/" so both /app/base (symlink target) and the worktree
    // dir (/tmp/execute-workspaces/...) are within scope.
    root: "/",
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      encoding: false,
    };
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: /node_modules/,
    };
    return config;
  },
  images: {
    // Disable remote patterns
    remotePatterns: [],
  },
};

export default nextConfig;
