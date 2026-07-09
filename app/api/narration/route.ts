import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * POST /api/narration — upload YOUR OWN narration (a natural human voice)
 * to use instead of AI text-to-speech.
 *
 * Stored as a MediaAsset (type AUDIO) owned by the uploader; generation
 * accepts its id as `narrationAssetId`. With an uploaded narration the
 * per-scene TTS pacing is skipped (one continuous recording can't be re-cut
 * per scene) — scene durations follow the request, and captions come from
 * Whisper transcription of the recording.
 */

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Map([
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/ogg', 'ogg'],
  ['audio/webm', 'webm'],
  ['video/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/m4a', 'm4a'],
  ['audio/x-m4a', 'm4a'],
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get('file');
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${file.type || 'unknown'}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Narration must be 50MB or smaller' }, { status: 413 });
  }

  try {
    const dir = path.join(process.cwd(), 'public', 'uploads', 'narration');
    fs.mkdirSync(dir, { recursive: true });
    const id = crypto.randomUUID();
    const filename = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const asset = await prisma.mediaAsset.create({
      data: {
        name: `narration-${id}`,
        fileName: file.name || filename,
        type: 'AUDIO',
        category: 'narration',
        url: `/uploads/narration/${filename}`,
        fileSize: BigInt(file.size),
        uploadedById: session.user.id,
      },
      select: { id: true, url: true, fileName: true },
    });

    return NextResponse.json({ assetId: asset.id, url: asset.url, fileName: asset.fileName });
  } catch (error) {
    console.error('[narration] upload failed:', error);
    return NextResponse.json({ error: 'Narration upload failed' }, { status: 500 });
  }
}
