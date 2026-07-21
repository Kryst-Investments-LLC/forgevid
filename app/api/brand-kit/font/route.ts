import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allowsCustomBranding, getUserPlan } from '@/lib/plan';
import { persistUploadBuffer } from '@/lib/upload-storage';

/**
 * POST /api/brand-kit/font — upload a brand typeface (.ttf/.otf).
 *
 * The renderer has always honored a brand font file in captions and lower
 * thirds; what was missing was the front door — the UI asked for "an absolute
 * path on the render host". This stores the font (Cloudinary 'raw' in prod,
 * local disk in dev), returns its url, and the client saves that url into the
 * brand kit's fontFamily field. The renderer localizes remote fonts to temp
 * before ffmpeg needs them.
 *
 * Separate from the brand kit PUT so the client can upload, preview, then save
 * — same shape as /api/brand-kit/logo. Paid plans only.
 */

const MAX_BYTES = 10 * 1024 * 1024;

/** Extension is the real signal — browsers report font MIME types haphazardly. */
const ALLOWED_EXT = new Map([
  ['.ttf', 'ttf'],
  ['.otf', 'otf'],
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  if (!allowsCustomBranding(plan)) {
    return NextResponse.json(
      { error: 'Custom branding requires a paid plan', upgradeRequired: true },
      { status: 403 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get('file');
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'No font file provided' }, { status: 400 });
  const dot = (file.name || '').lastIndexOf('.');
  const ext = dot >= 0 ? ALLOWED_EXT.get(file.name.slice(dot).toLowerCase()) : undefined;
  if (!ext) {
    return NextResponse.json({ error: 'Font must be a .ttf or .otf file' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Font must be 10MB or smaller' }, { status: 413 });
  }

  try {
    const url = await persistUploadBuffer(Buffer.from(await file.arrayBuffer()), {
      ext,
      folder: 'fonts',
      resourceType: 'raw',
    });
    return NextResponse.json({ url, fileName: file.name });
  } catch (error) {
    console.error('[brand-kit/font] upload failed:', error);
    return NextResponse.json({ error: 'Font upload failed' }, { status: 500 });
  }
}
