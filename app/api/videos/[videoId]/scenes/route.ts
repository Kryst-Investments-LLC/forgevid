import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVideoOwner } from '@/lib/video-access';
import { loadScenes, saveScenes } from '@/lib/generation-pipeline';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * Scene list for a generated video.
 *
 * GET   /api/videos/[videoId]/scenes  — the persisted scene structure
 * PATCH /api/videos/[videoId]/scenes  — edit one scene's script line / duration
 *
 * Edits only mutate the stored scene list; call POST /rerender to produce a new
 * MP4 from the edited scenes.
 */

export async function GET(_req: NextRequest, { params }: { params: { videoId: string } }) {
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const scenes = await loadScenes(params.videoId);
  return NextResponse.json({ videoId: params.videoId, scenes });
}

const patchSchema = z.object({
  sceneId: z.string().min(1),
  description: z.string().min(1).max(500).optional(),
  // The stock-search term for this scene, independent of the prose above.
  // Editing it and calling /swap re-resolves footage against the new words.
  searchQuery: z.string().max(120).optional(),
  duration: z.number().positive().max(120).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { videoId: string } }) {
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { sceneId, description, searchQuery, duration } = parsed.data;
  if (description === undefined && searchQuery === undefined && duration === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const scenes = await loadScenes(params.videoId);
  const index = scenes.findIndex((s) => s.id === sceneId);
  if (index === -1) {
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  }

  const updated = {
    ...scenes[index],
    ...(description !== undefined ? { description } : {}),
    ...(searchQuery !== undefined ? { searchQuery } : {}),
    ...(duration !== undefined ? { duration } : {}),
  };
  scenes[index] = updated;
  await saveScenes(params.videoId, scenes);
  await recordProductEvent(access.userId, PRODUCT_ACTIONS.sceneEdit, {
    videoId: params.videoId,
    sceneId,
  });

  return NextResponse.json({ scene: updated });
}
