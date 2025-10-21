

import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' ws://localhost:3001 *.vercel-insights.com *.vercel-analytics.com;"
          }
        ]
      }
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));