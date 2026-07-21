import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { persistUploadBuffer } from '@/lib/upload-storage';

/**
 * POST /api/media/upload — the agent's own photos and clips.
 *
 * The generation pipeline has always been able to USE a user's media: it fills
 * scenes in order, stills get Ken Burns motion, and every asset is resolved by
 * id and ownership-checked so the renderer never fetches a client-supplied url.
 *
 * What was missing was the front door. `POST /api/media` only records a url you
 * already host somewhere, so an estate agent with five photos of a house on
 * their laptop had no way in. This is that way in: multipart file bytes, stored
 * under public/uploads/media, returned as MediaAsset ids ready to be passed to
 * a generation as `mediaAssetIds`.
 *
 * Accepts several files in one request, and preserves their ORDER, because that
 * order decides which scene each photo lands on.
 */

export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 20;

const EXT_BY_TYPE = new Map<string, { ext: string; kind: 'IMAGE' | 'VIDEO' }>([
  ['image/jpeg', { ext: 'jpg', kind: 'IMAGE' }],
  ['image/jpg', { ext: 'jpg', kind: 'IMAGE' }],
  ['image/png', { ext: 'png', kind: 'IMAGE' }],
  ['image/webp', { ext: 'webp', kind: 'IMAGE' }],
  ['image/heic', { ext: 'heic', kind: 'IMAGE' }],
  ['video/mp4', { ext: 'mp4', kind: 'VIDEO' }],
  ['video/quicktime', { ext: 'mov', kind: 'VIDEO' }],
  ['video/webm', { ext: 'webm', kind: 'VIDEO' }],
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let files: File[] = [];
  try {
    const form = await req.formData();
    files = form
      .getAll('files')
      .concat(form.getAll('file'))
      .filter((v): v is File => v instanceof File);
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `At most ${MAX_FILES} files per upload` }, { status: 413 });
  }

  const assets: Array<{ assetId: string; url: string; name: string; type: string }> = [];

  // Sequential, so the returned ids keep the caller's order — that order is what
  // decides which scene each photo fills.
  for (const file of files) {
    const meta = EXT_BY_TYPE.get(file.type);
    if (!meta) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || 'unknown'} (${file.name})` },
        { status: 415 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is larger than 100MB` }, { status: 413 });
    }

    try {
      const id = crypto.randomUUID();
      // Cloudinary when configured (split web/worker deploys share no disk),
      // local disk otherwise.
      const url = await persistUploadBuffer(Buffer.from(await file.arrayBuffer()), {
        ext: meta.ext,
        folder: 'media',
        resourceType: meta.kind === 'IMAGE' ? 'image' : 'video',
      });

      const asset = await prisma.mediaAsset.create({
        data: {
          // MediaAsset.name is globally unique — the uuid keeps it collision-free.
          name: `media-${id}`,
          fileName: file.name || `${id}.${meta.ext}`,
          type: meta.kind,
          category: 'upload',
          url,
          fileSize: BigInt(file.size),
          uploadedById: session.user.id,
        },
        select: { id: true, url: true, fileName: true, type: true },
      });

      assets.push({
        assetId: asset.id,
        url: asset.url,
        name: asset.fileName,
        type: asset.type,
      });
    } catch (error) {
      console.error('[media/upload] failed:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  }

  return NextResponse.json({
    assets,
    /** Pass straight to POST /api/ai as `mediaAssetIds` — order is preserved. */
    mediaAssetIds: assets.map((a) => a.assetId),
  });
}
