import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireVideoOwner } from '@/lib/video-access';
import { loadScenes, saveScenes } from '@/lib/generation-pipeline';
import { resolveSceneClip, isStockProviderConfigured } from '@/lib/video-generator';
import type { AspectRatio } from '@/lib/video-generator';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';
import { recordRejectedClip, rejectedClipUrls } from '@/lib/clip-memory';

/**
 * Swap one scene's stock clip for a different match.
 *
 * POST /api/videos/[videoId]/scenes/[sceneId]/swap
 *
 * Re-searches footage for that scene only, excluding the clip it currently uses
 * and every clip other scenes use, so a swap never yields a duplicate. Mutates
 * the stored scene list; call POST /rerender to re-encode the video.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { videoId: string; sceneId: string } },
) {
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (!isStockProviderConfigured()) {
    return NextResponse.json(
      { error: 'No stock footage provider configured. Set PEXELS_API_KEY.' },
      { status: 503 },
    );
  }

  const scenes = await loadScenes(params.videoId);
  const index = scenes.findIndex((s) => s.id === params.sceneId);
  if (index === -1) {
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  }

  // Exclude every clip currently in use, including this scene's own — AND
  // everything this user has rejected before. Pressing "Swap" twice on the same
  // scene used to be able to hand back a clip they had already refused.
  const exclude = new Set(scenes.map((s) => s.clipUrl).filter(Boolean));
  for (const url of await rejectedClipUrls(access.userId)) exclude.add(url);

  // The clip being swapped away IS the rejection. Remember it, and the query it
  // came from: this is the only quality signal the product ever gets for free.
  const rejectedClip = scenes[index].clipUrl;
  const rejectedQuery = scenes[index].matchedQuery;

  // Search in the video's own orientation, otherwise a 9:16 video gets a
  // landscape replacement clip.
  const video = await prisma.video.findUnique({
    where: { id: params.videoId },
    select: { metadata: true },
  });
  let aspectRatio: AspectRatio = '16:9';
  try {
    aspectRatio = JSON.parse(video?.metadata ?? '{}')?.request?.aspectRatio ?? '16:9';
  } catch {
    // keep the default
  }

  const replacement = await resolveSceneClip(scenes[index], exclude, aspectRatio);
  if (!replacement) {
    return NextResponse.json(
      { error: 'No alternative footage found for this scene' },
      { status: 422 },
    );
  }

  scenes[index] = replacement;
  await saveScenes(params.videoId, scenes);
  await recordRejectedClip(access.userId, {
    clipUrl: rejectedClip,
    query: rejectedQuery,
    videoId: params.videoId,
    sceneId: params.sceneId,
  });
  await recordProductEvent(access.userId, PRODUCT_ACTIONS.clipSwap, {
    videoId: params.videoId,
    sceneId: params.sceneId,
  });

  return NextResponse.json({ scene: replacement });
}
