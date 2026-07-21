import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { uploadBuffer } from './cloudinary';

/**
 * Where user uploads live.
 *
 * In production the web app and the render worker are separate services with no
 * shared disk (Railway/Render/Vercel+worker) — a file written to the web
 * container's public/uploads is INVISIBLE to the worker, so narration would
 * silently fall back to AI TTS and media scenes would go missing. When
 * Cloudinary is configured, every upload therefore goes there and callers store
 * the returned https url; the worker-side resolvers (downloadFile,
 * audioAssetForVideo) already fetch remote urls to temp.
 *
 * Without Cloudinary (local dev, single host) files land under
 * public/uploads/<folder>/ exactly as before, so nothing external is required
 * to run the app.
 */

export function isCloudStorageConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export interface PersistUploadOptions {
  /** File extension WITHOUT the dot (jpg, mp3, mp4, ...). */
  ext: string;
  /** Subfolder: local => public/uploads/<folder>, Cloudinary => forgevid/<folder>. */
  folder: string;
  /**
   * Cloudinary resource type. Audio uploads use 'video' (Cloudinary serves
   * audio through its video pipeline); fonts and other opaque files use 'raw';
   * mixed/unknown content uses 'auto'.
   */
  resourceType: 'image' | 'video' | 'raw' | 'auto';
}

/**
 * Persist an uploaded file and return a url usable by BOTH the browser and the
 * render worker. Cloudinary secure_url when configured, /uploads/... otherwise.
 */
export async function persistUploadBuffer(
  bytes: Buffer,
  { ext, folder, resourceType }: PersistUploadOptions,
): Promise<string> {
  if (isCloudStorageConfigured()) {
    const { secure_url } = await uploadBuffer(bytes, {
      resource_type: resourceType,
      folder: `forgevid/${folder}`,
    });
    return secure_url;
  }
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), bytes);
  return `/uploads/${folder}/${filename}`;
}
