/**
 * Import a website's own hero images as the user's MediaAssets.
 *
 * Why store them instead of handing urls to the renderer: the generator
 * deliberately only accepts MediaAsset ids it can ownership-check
 * (lib/user-media.ts). Downloading the image once, here, behind the SSRF
 * guard, means the renderer never fetches a client-supplied url — and the
 * product's real screenshots become scene stills with Ken Burns motion.
 *
 * Relative imports only — reachable from the worker process.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { safeFetch } from './safe-fetch';
import { moderateImageUrl } from './moderation';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Only formats ffmpeg will reliably decode as a still. */
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface ImportedImage {
  assetId: string;
  url: string;
  sourceUrl: string;
}

/**
 * Persist screenshots captured by the headless renderer as IMAGE assets owned
 * by the user. These are the product's OWN interface — the strongest possible
 * footage for a product commercial. The bytes are already in hand (no fetch),
 * so there is no SSRF surface here.
 */
export async function saveScreenshots(
  userId: string,
  screenshots: Buffer[],
  sourceUrl: string,
): Promise<ImportedImage[]> {
  const saved: ImportedImage[] = [];
  const dir = path.join(process.cwd(), 'public', 'uploads', 'site');
  fs.mkdirSync(dir, { recursive: true });

  for (const png of screenshots) {
    if (!png || png.length === 0) continue;
    try {
      const id = crypto.randomUUID();
      const filename = `${id}.png`;
      fs.writeFileSync(path.join(dir, filename), png);
      const asset = await prisma.mediaAsset.create({
        data: {
          name: `shot-${id}`,
          fileName: `${new URL(sourceUrl).hostname}-screenshot.png`,
          type: 'IMAGE',
          category: 'site-screenshot',
          url: `/uploads/site/${filename}`,
          fileSize: BigInt(png.length),
          uploadedById: userId,
          metadata: JSON.stringify({ sourceUrl, capturedBy: 'headless' }),
        },
        select: { id: true, url: true },
      });
      saved.push({ assetId: asset.id, url: asset.url, sourceUrl });
    } catch (error) {
      console.warn('[SiteImages] Screenshot save failed:', error instanceof Error ? error.message : error);
    }
  }
  return saved;
}

/**
 * Download each image through the SSRF guard and persist it as an IMAGE asset
 * owned by `userId`. Individual failures are skipped, never fatal: a promo
 * with three of four screenshots still beats no promo. Returns what landed.
 */
export async function importSiteImages(
  userId: string,
  imageUrls: string[],
  limit = 4,
): Promise<ImportedImage[]> {
  const imported: ImportedImage[] = [];
  const dir = path.join(process.cwd(), 'public', 'uploads', 'site');

  for (const sourceUrl of imageUrls.slice(0, limit)) {
    try {
      const { body, contentType } = await safeFetch(sourceUrl, {
        maxBytes: MAX_IMAGE_BYTES,
        timeoutMs: 10_000,
        acceptTypes: ['image'],
        headers: { Accept: 'image/*' },
      });

      const bare = contentType.split(';')[0].trim().toLowerCase();
      const ext = EXT_BY_TYPE[bare];
      if (!ext || body.length === 0) continue;

      // Content policy: moderate the downloaded bytes before they can be
      // rendered. This is the mediaOnly bypass plug — a user's own photos never
      // otherwise reach any AI provider. Moderate what we actually have.
      const imageModeration = await moderateImageUrl(`data:${bare};base64,${body.toString('base64')}`);
      if (!imageModeration.allowed) {
        console.warn(
          `[site-images] blocked image from ${sourceUrl}: ${imageModeration.categories.join(', ') || imageModeration.reason}`,
        );
        continue;
      }

      fs.mkdirSync(dir, { recursive: true });
      const id = crypto.randomUUID();
      const filename = `${id}.${ext}`;
      fs.writeFileSync(path.join(dir, filename), body);

      const asset = await prisma.mediaAsset.create({
        data: {
          // MediaAsset.name is globally unique — the uuid keeps it collision-free.
          name: `site-${id}`,
          fileName: path.basename(new URL(sourceUrl).pathname) || filename,
          type: 'IMAGE',
          category: 'site-import',
          url: `/uploads/site/${filename}`,
          fileSize: BigInt(body.length),
          uploadedById: userId,
          metadata: JSON.stringify({ sourceUrl }),
        },
        select: { id: true, url: true },
      });

      imported.push({ assetId: asset.id, url: asset.url, sourceUrl });
    } catch (error) {
      // Hotlink protection, 404s, dead CDNs — expected, and not worth failing on.
      console.warn(
        `[SiteImages] Skipped ${sourceUrl}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return imported;
}
