import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { listMusicTracks } from '@/lib/music-library';

/**
 * Background music the user brings themselves.
 *
 * GET  /api/music — the bundled library (may be empty) + this user's uploads
 * POST /api/music — upload a track (multipart), stored as an AUDIO MediaAsset
 *
 * ForgeVid ships NO music: every track needs a licence, and silently bundling
 * one would hand our users a copyright claim on their commercial. So the
 * mixing pipeline (loop, duck under narration, amix) has always been real and
 * tested, and simply had nothing to play. This is the missing input.
 */

export const dynamic = 'force-dynamic';

const MAX_BYTES = 30 * 1024 * 1024;
const ALLOWED = new Map([
  ['audio/mpeg', 'mp3'],
  ['audio/mp3', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/ogg', 'ogg'],
  ['audio/mp4', 'm4a'],
  ['audio/m4a', 'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/aac', 'aac'],
  ['audio/flac', 'flac'],
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const uploads = await prisma.mediaAsset.findMany({
    where: { uploadedById: session.user.id, type: 'AUDIO', category: 'music' },
    select: { id: true, name: true, fileName: true, url: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    // Bundled moods, if the operator has licensed and installed any.
    library: listMusicTracks(),
    tracks: uploads.map((u) => ({
      assetId: u.id,
      name: u.fileName || u.name,
      url: u.url,
    })),
  });
}

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
    return NextResponse.json({ error: 'Music must be 30MB or smaller' }, { status: 413 });
  }

  try {
    const dir = path.join(process.cwd(), 'public', 'uploads', 'music');
    fs.mkdirSync(dir, { recursive: true });
    const id = crypto.randomUUID();
    const filename = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const asset = await prisma.mediaAsset.create({
      data: {
        name: `music-${id}`, // MediaAsset.name is globally unique
        fileName: file.name || filename,
        type: 'AUDIO',
        category: 'music',
        url: `/uploads/music/${filename}`,
        fileSize: BigInt(file.size),
        uploadedById: session.user.id,
      },
      select: { id: true, url: true, fileName: true },
    });

    return NextResponse.json({ assetId: asset.id, url: asset.url, name: asset.fileName });
  } catch (error) {
    console.error('[music] upload failed:', error);
    return NextResponse.json({ error: 'Music upload failed' }, { status: 500 });
  }
}
