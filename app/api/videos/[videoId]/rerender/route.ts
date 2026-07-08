import { NextRequest, NextResponse } from 'next/server';
import { requireVideoOwner } from '@/lib/video-access';
import { enqueueRerender } from '@/lib/video-queue';
import { loadScenes, rerenderVideo, setStage } from '@/lib/generation-pipeline';

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

  await setStage(params.videoId, 'queued');

  const jobId = await enqueueRerender({ videoId: params.videoId, userId: access.userId });
  if (!jobId) {
    // No Redis configured: run inline without blocking the HTTP response.
    void rerenderVideo(params.videoId).catch((err) => {
      console.error(
        '[rerender] inline re-render failed:',
        err instanceof Error ? err.message : err,
      );
    });
  }

  return NextResponse.json({
    videoId: params.videoId,
    jobId: jobId ?? null,
    status: 'queued',
    mode: jobId ? 'queued' : 'inline',
    sceneCount: scenes.length,
  });
}
