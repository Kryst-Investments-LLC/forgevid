import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireVideoOwner } from '@/lib/video-access';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * POST /api/videos/[videoId]/share { enabled: boolean }
 *
 * Sharing is an explicit opt-in per video, not id-guessability: the public
 * page /v/[id] returns 404 unless metadata.shareEnabled is true.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ videoId: string }> }) {
  const params = await props.params;
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = z
    .object({ enabled: z.boolean() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Expected { enabled: boolean }' }, { status: 400 });
  }

  const video = await prisma.video.findUniqueOrThrow({
    where: { id: params.videoId },
    select: { metadata: true, status: true },
  });
  if (parsed.data.enabled && video.status !== 'COMPLETED') {
    return NextResponse.json({ error: 'Only finished videos can be shared' }, { status: 422 });
  }

  let meta: Record<string, any> = {};
  try {
    meta = JSON.parse(video.metadata ?? '{}');
  } catch {
    meta = {};
  }
  meta.shareEnabled = parsed.data.enabled;

  await prisma.video.update({
    where: { id: params.videoId },
    data: { metadata: JSON.stringify(meta) },
  });

  if (parsed.data.enabled) {
    await recordProductEvent(access.userId, PRODUCT_ACTIONS.shareEnabled, {
      videoId: params.videoId,
    });
  }

  return NextResponse.json({
    shareEnabled: parsed.data.enabled,
    shareUrl: parsed.data.enabled ? `/v/${params.videoId}` : null,
  });
}
