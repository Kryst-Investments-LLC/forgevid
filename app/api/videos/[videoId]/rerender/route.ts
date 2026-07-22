import { NextRequest, NextResponse } from 'next/server';
import { requireVideoOwner } from '@/lib/video-access';
import { enqueueRerender } from '@/lib/video-queue';
import { loadScenes, planRerender, rerenderVideo, setStage } from '@/lib/generation-pipeline';
import { withRenderSlot } from '@/lib/render-semaphore';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * Re-encode a video from its (possibly edited) persisted scenes.
 *
 * POST /api/videos/[videoId]/rerender
 *
 * Returns immediately; poll GET /api/ai/jobs/[videoId] for progress, same as a
 * fresh generation. Runs on the worker when REDIS_URL is set, else inline.
 */
export async function POST(_req: NextRequest, { params }: { params: { videoId: string } }) {
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const scenes = await loadScenes(params.videoId);
  if (scenes.length === 0) {
    return NextResponse.json(
      { error: 'This video has no persisted scenes to re-render' },
      { status: 422 },
    );
  }

  // Edit metering (lib/generation-pipeline.ts) is a fast DB + filesystem check
  // — cheap enough to run up front, synchronously, so a capped user gets a
  // friendly 429 immediately instead of the job silently failing later on the
  // worker (Redis path) or in the fire-and-forget inline path.
  try {
    await planRerender(params.videoId);
  } catch (err: any) {
    if (err?.code === 'edit_limit') {
      return NextResponse.json({ error: err.message, code: 'edit_limit' }, { status: 429 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'This video has no persisted scenes to re-render' },
      { status: 422 },
    );
  }

  await setStage(params.videoId, 'queued');

  const jobId = await enqueueRerender({ videoId: params.videoId, userId: access.userId });
  if (!jobId) {
    // No Redis: run inline, throttled — re-renders are full ffmpeg chains too.
    void withRenderSlot(() => rerenderVideo(params.videoId)).catch((err) => {
      console.error(
        '[rerender] inline re-render failed:',
        err instanceof Error ? err.message : err,
      );
    });
  }

  await recordProductEvent(access.userId, PRODUCT_ACTIONS.rerender, { videoId: params.videoId });

  return NextResponse.json({
    videoId: params.videoId,
    jobId: jobId ?? null,
    status: 'queued',
    mode: jobId ? 'queued' : 'inline',
    sceneCount: scenes.length,
  });
}
