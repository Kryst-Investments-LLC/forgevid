/**
 * "Use my product shots" — the user's own media in a generation.
 *
 * Assets are resolved from the DB by id and OWNERSHIP-CHECKED here, never taken
 * as urls from the client: otherwise anyone could make the renderer fetch an
 * arbitrary URL on the server.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';

export interface UserMediaItem {
  url: string;
  mediaType: 'video' | 'image';
  name: string;
}

/**
 * Resolve MediaAsset ids the user owns, preserving the order they were given
 * (that order decides which scene each asset lands on). Unknown ids, assets
 * owned by someone else, and non-visual types are dropped.
 */
export async function resolveUserMedia(
  userId: string,
  assetIds: string[],
): Promise<UserMediaItem[]> {
  if (!assetIds || assetIds.length === 0) return [];

  const assets = await prisma.mediaAsset.findMany({
    where: {
      id: { in: assetIds },
      uploadedById: userId,
      type: { in: ['IMAGE', 'VIDEO'] },
    },
    select: { id: true, url: true, type: true, name: true },
  });

  const byId = new Map(assets.map((a) => [a.id, a]));

  return assetIds
    .map((id) => byId.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a?.url))
    .map((a) => ({
      url: a.url,
      mediaType: a.type === 'IMAGE' ? ('image' as const) : ('video' as const),
      name: a.name,
    }));
}
