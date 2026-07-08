import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cloudinary';
import { allowsCustomBranding, getUserPlan } from '@/lib/plan';

/**
 * POST /api/brand-kit/logo — upload a logo image, returns its CDN url.
 *
 * Separate from the brand kit PUT so the client can upload, preview, then save.
 * Paid plans only; the renderer ignores a stored logo on a free plan anyway.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

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

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Image hosting is not configured (CLOUDINARY_CLOUD_NAME)' },
      { status: 503 },
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

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type || 'unknown'}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Logo must be 5MB or smaller' }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadBuffer(buffer, {
      folder: `forgevid/brand-kits/${session.user.id}`,
      resource_type: 'image',
    });
    return NextResponse.json({ url: upload.secure_url });
  } catch (error) {
    console.error('[brand-kit] logo upload failed');
    return NextResponse.json({ error: 'Logo upload failed' }, { status: 500 });
  }
}
