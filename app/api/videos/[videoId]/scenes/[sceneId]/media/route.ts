import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVideoOwner } from '@/lib/video-access';
import { loadScenes, saveScenes } from '@/lib/generation-pipeline';
import { resolveUserMedia } from '@/lib/user-media';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * Point ONE scene at a SPECIFIC image or clip the user owns.
 *
 * POST /api/videos/[videoId]/scenes/[sceneId]/media  { assetId }
 *
 * The existing /swap endpoint re-rolls the stock search and takes whatever it
 * gets; this is the "no, THAT one" the editor was missing. The asset is
 * resolved by id and OWNERSHIP-CHECKED — a url from the client would let the
 * renderer be pointed at any address on the internet.
 *
 * Mutates the stored scene list; call POST /rerender to re-encode.
 */

const bodySchema = z.object({ assetId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ videoId: string; sceneId: string }> }
) {
  const params = await props.params;
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const scenes = await loadScenes(params.videoId);
  const index = scenes.findIndex((s) => s.id === params.sceneId);
  if (index === -1) {
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  }

  // Ownership is enforced here: resolveUserMedia only returns assets uploaded
  // by this user. An asset id belonging to someone else resolves to nothing.
  const [media] = await resolveUserMedia(access.userId, [parsed.data.assetId]);
  if (!media) {
    return NextResponse.json(
      { error: 'That media was not found in your library' },
      { status: 404 },
    );
  }

  const updated = {
    ...scenes[index],
    clipUrl: media.url,
    mediaType: media.mediaType,
    matchedQuery: `your media: ${media.name}`,
    // The old poster frame belongs to footage that is no longer on screen.
    thumbnailUrl: undefined,
  };
  scenes[index] = updated;

  await saveScenes(params.videoId, scenes);
  await recordProductEvent(access.userId, PRODUCT_ACTIONS.sceneMedia, {
    videoId: params.videoId,
    sceneId: params.sceneId,
    assetId: parsed.data.assetId,
  });

  return NextResponse.json({ scene: updated, rerenderRequired: true });
}
