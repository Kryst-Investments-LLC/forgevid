/**
 * The platform's memory of what a user did NOT want.
 *
 * ForgeVid already remembers preferences: `computeUserDefaults` learns a user's
 * style, aspect ratio and voice from their last twenty videos, so the studio
 * opens where they left off. What it never learned from is the strongest signal
 * the product produces — a REJECTION.
 *
 * Every time someone presses "Swap clip", they are saying: *for this query, that
 * footage was wrong.* That event was recorded as `{videoId, sceneId}` and thrown
 * away: not which clip, not which query. So the same unwanted shot could be
 * served back on the very next generation, and the product could not improve.
 *
 * Here we remember the clip and the query behind it, and seed the stock search's
 * exclusion set with everything this user has already rejected. The system gets
 * quietly better the more it is used, per user, without any model retraining.
 *
 * Best-effort throughout: memory is a nicety, and must never fail a render.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';

export const CLIP_REJECTED_ACTION = 'clip_rejected';

/** How far back we look. A year-old rejection should not haunt a user forever. */
const MEMORY_WINDOW_DAYS = 180;
const MEMORY_LIMIT = 300;

/**
 * Remember that this user rejected this clip for this query.
 *
 * Storing the query too means a future version can be smarter than a blocklist:
 * "they rejected three beach clips for 'ocean waves'" is a signal about the
 * QUERY, not just the clips.
 */
export async function recordRejectedClip(
  userId: string,
  args: { clipUrl: string; query?: string; videoId?: string; sceneId?: string },
): Promise<void> {
  if (!args.clipUrl) return;
  try {
    await prisma.usageRecord.create({
      data: {
        userId,
        action: CLIP_REJECTED_ACTION,
        resourceType: 'clip',
        metadata: JSON.stringify({
          clipUrl: args.clipUrl,
          query: args.query ?? null,
          videoId: args.videoId ?? null,
          sceneId: args.sceneId ?? null,
        }),
      },
    });
  } catch (error) {
    console.error('[ClipMemory] Could not record a rejection (non-fatal):', error);
  }
}

/**
 * Every clip this user has rejected recently. Seeded into the stock search's
 * exclusion set so we never offer the same unwanted footage twice.
 *
 * Returns an empty set on any failure: a user who cannot read their memory must
 * still be able to make a video.
 */
export async function rejectedClipUrls(userId: string): Promise<Set<string>> {
  const urls = new Set<string>();
  try {
    const since = new Date(Date.now() - MEMORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.usageRecord.findMany({
      where: { userId, action: CLIP_REJECTED_ACTION, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
      take: MEMORY_LIMIT,
      select: { metadata: true },
    });
    for (const row of rows) {
      try {
        const url = JSON.parse(row.metadata ?? '{}')?.clipUrl;
        if (typeof url === 'string' && url) urls.add(url);
      } catch {
        // one corrupt row must not blind the whole memory
      }
    }
  } catch (error) {
    console.error('[ClipMemory] Could not read rejections (non-fatal):', error);
  }
  return urls;
}

/**
 * How often a user rejected the footage we picked, over the last N generations.
 *
 * This is the product's own quality score. If it climbs, the stock matching got
 * worse; if it falls, the searchQuery work paid off. It is the number to watch.
 */
export async function rejectionRate(userId: string, windowDays = 30): Promise<{
  rejections: number;
  generations: number;
  rate: number;
}> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  try {
    const [rejections, generations] = await Promise.all([
      prisma.usageRecord.count({
        where: { userId, action: CLIP_REJECTED_ACTION, timestamp: { gte: since } },
      }),
      prisma.usageRecord.count({
        where: { userId, action: 'video_generation', timestamp: { gte: since } },
      }),
    ]);
    return { rejections, generations, rate: generations > 0 ? rejections / generations : 0 };
  } catch {
    return { rejections: 0, generations: 0, rate: 0 };
  }
}
