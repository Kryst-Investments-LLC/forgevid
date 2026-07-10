

import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
const backendApiOrigin = process.env.BACKEND_API_ORIGIN?.replace(/\/$/, '');
const collaborationUrl = process.env.NEXT_PUBLIC_COLLABORATION_URL?.replace(/\/$/, '');
const collaborationWsUrl = collaborationUrl?.replace(/^http/, 'ws');

function buildExternalRewrites() {
  if (!backendApiOrigin) {
    return [];
  }

  return [
    { source: '/api/ai', destination: `${backendApiOrigin}/api/ai` },
    { source: '/api/ai/:path*', destination: `${backendApiOrigin}/api/ai/:path*` },
    { source: '/api/editor/:path*', destination: `${backendApiOrigin}/api/editor/:path*` },
    { source: '/api/videos/upload/:path*', destination: `${backendApiOrigin}/api/videos/upload/:path*` },
    { source: '/api/media/:path*', destination: `${backendApiOrigin}/api/media/:path*` },
    { source: '/generated/:path*', destination: `${backendApiOrigin}/generated/:path*` },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize ffmpeg packages to avoid webpack bundling issues
      config.externals = config.externals || [];
      config.externals.push('fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', '@ffmpeg/ffmpeg', '@ffmpeg/util');
    }
    return config;
  },
  async rewrites() {
    // Serve public assets even when a locale prefix is present
    return [
      { source: '/:locale(div|en|es|hi|zh|ja|fr|it|ko|pt|de)/:file*', destination: '/:file*' },
      ...buildExternalRewrites(),
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CSP is set per-request in middleware/csp.ts: it needs a nonce for
          // Next's inline bootstrap scripts, and a static header cannot carry one.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ]
      },
      // CDN cache headers for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/videos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));