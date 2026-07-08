

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

function buildConnectSrc(isDev) {
  return [
    "'self'",
    isDev ? 'ws://localhost:3001' : null,
    'wss://forgevid.com',
    'https://api.stripe.com',
    'https://api.pexels.com',
    'https://api.openai.com',
    'https://api.replicate.com',
    'https://us.i.posthog.com',
    '*.vercel-insights.com',
    '*.vercel-analytics.com',
    process.env.CDN_BASE_URL || null,
    backendApiOrigin || null,
    collaborationUrl || null,
    collaborationWsUrl || null,
  ].filter(Boolean).join(' ');
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
    const isDev = process.env.NODE_ENV !== 'production';
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob: https://res.cloudinary.com",
      `connect-src ${buildConnectSrc(isDev)}`,
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
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