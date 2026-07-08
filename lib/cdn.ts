/**
 * CDN Asset Delivery Layer
 *
 * Routes all media through a CDN (CloudFront or Cloudflare) for:
 * - Global edge caching (faster delivery worldwide)
 * - Automatic format conversion (WebP/AVIF for images, adaptive for video)
 * - Image/video transformations at the edge
 * - Bandwidth cost reduction via caching
 *
 * Configuration:
 * - Set CDN_BASE_URL to your CloudFront/Cloudflare distribution URL
 * - Falls back to Cloudinary URLs when CDN is not configured
 */

const CDN_BASE_URL = process.env.CDN_BASE_URL || ''; // e.g. https://cdn.forgevid.com
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'forgevid';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;

export interface CDNOptions {
  /** Image width for responsive sizing */
  width?: number;
  /** Image height */
  height?: number;
  /** Quality (1-100 or 'auto') */
  quality?: number | 'auto';
  /** Output format */
  format?: 'auto' | 'webp' | 'avif' | 'mp4' | 'webm';
  /** Crop mode */
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  /** Cache TTL in seconds (default: 1 year for immutable assets) */
  cacheTTL?: number;
}

/**
 * Convert a Cloudinary public_id to a CDN-optimized URL
 */
export function cdnUrl(publicId: string, type: 'image' | 'video' = 'image', options: CDNOptions = {}): string {
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.quality) transforms.push(`q_${options.quality}`);
  if (options.format) transforms.push(`f_${options.format}`);
  if (options.crop) transforms.push(`c_${options.crop}`);

  // Default optimizations
  if (!options.quality) transforms.push('q_auto');
  if (!options.format) transforms.push('f_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  const cloudinaryPath = `/${type}/upload/${transformStr}${publicId}`;

  if (CDN_BASE_URL) {
    // Route through CDN (CloudFront/Cloudflare proxying Cloudinary)
    return `${CDN_BASE_URL}${cloudinaryPath}`;
  }

  // Fallback to direct Cloudinary URL
  return `${CLOUDINARY_BASE}${cloudinaryPath}`;
}

/**
 * Convert a raw URL to a CDN-proxied URL
 */
export function cdnProxyUrl(originalUrl: string): string {
  if (!CDN_BASE_URL) return originalUrl;

  // Already a CDN URL
  if (originalUrl.startsWith(CDN_BASE_URL)) return originalUrl;

  // Cloudinary URL — rewrite to CDN
  if (originalUrl.includes('res.cloudinary.com')) {
    const path = originalUrl.replace(/https?:\/\/res\.cloudinary\.com\/[^/]+/, '');
    return `${CDN_BASE_URL}${path}`;
  }

  // External URL — pass through CDN fetch proxy
  return `${CDN_BASE_URL}/fetch/${encodeURIComponent(originalUrl)}`;
}

/**
 * Generate responsive image srcSet for CDN-served images
 */
export function cdnSrcSet(publicId: string, widths: number[] = [320, 640, 960, 1280, 1920]): string {
  return widths
    .map((w) => `${cdnUrl(publicId, 'image', { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Generate video poster (thumbnail) URL
 */
export function cdnVideoPoster(publicId: string, options: { time?: string; width?: number } = {}): string {
  const transforms: string[] = ['f_jpg', 'q_auto'];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.time) transforms.push(`so_${options.time}`);

  const transformStr = transforms.join(',');
  const path = `/video/upload/${transformStr}/${publicId}.jpg`;

  return CDN_BASE_URL ? `${CDN_BASE_URL}${path}` : `${CLOUDINARY_BASE}${path}`;
}

/**
 * Generate adaptive streaming (HLS) URL for video playback
 */
export function cdnVideoStreamUrl(publicId: string, quality: 'auto' | '720p' | '1080p' | '4k' = 'auto'): string {
  const qualityMap: Record<string, string> = {
    auto: 'q_auto',
    '720p': 'q_auto,h_720',
    '1080p': 'q_auto,h_1080',
    '4k': 'q_auto,h_2160',
  };

  const transform = qualityMap[quality] || 'q_auto';
  const path = `/video/upload/${transform}/sp_auto/${publicId}.m3u8`;

  return CDN_BASE_URL ? `${CDN_BASE_URL}${path}` : `${CLOUDINARY_BASE}${path}`;
}

/**
 * Cache headers for CDN-served responses (use in Next.js API routes)
 */
export function cdnCacheHeaders(maxAge: number = 31536000, staleWhileRevalidate: number = 86400): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'CDN-Cache-Control': `public, max-age=${maxAge}`,
    'Vary': 'Accept-Encoding',
  };
}

/**
 * Next.js config headers for static assets served via CDN
 */
export function getCDNHeaders(): Array<{ source: string; headers: Array<{ key: string; value: string }> }> {
  return [
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
}
