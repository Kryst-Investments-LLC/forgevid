/**
 * The product loop — the platform's memory about itself.
 *
 * Three parts, one flywheel:
 *
 *  RECORD   Every meaningful action lands in UsageRecord (generations already
 *           do via quota; edits, re-renders, shares and downloads join them).
 *  RECALL   computeUserDefaults() turns a user's history into their next
 *           starting point — the UI opens pre-set to what they actually use.
 *  REFLECT  getProductInsights() aggregates the numbers that say what to fix
 *           next: failure rate, edit rate, re-render rate, style demand, unit
 *           cost. This is the evidence base for improving the product — and
 *           the labelled dataset a future model for this platform trains on.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';
import { GENERATION_ACTION } from './quota';

/** Actions worth remembering. Kept as strings — UsageRecord.action is free-form. */
export const PRODUCT_ACTIONS = {
  generation: GENERATION_ACTION,
  rerender: 'video_rerender',
  sceneEdit: 'scene_edit',
  chatEdit: 'scene_chat_edit',
  clipSwap: 'scene_clip_swap',
  captionsDownload: 'captions_download',
  shareEnabled: 'share_enabled',
} as const;

export type ProductAction = (typeof PRODUCT_ACTIONS)[keyof typeof PRODUCT_ACTIONS];

/** Best-effort event write — telemetry must never fail the action it observes. */
export async function recordProductEvent(
  userId: string,
  action: ProductAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.usageRecord.create({
      data: {
        userId,
        action,
        resourceType: 'video',
        quantity: 1,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('[ProductLoop] Failed to record event:', error);
  }
}

export interface UserDefaults {
  style: string | null;
  aspectRatio: string | null;
  voiceId: string | null;
  basedOnVideos: number;
}

/**
 * What this user actually uses, learned from their own videos' request
 * metadata. Feeds the AI Studio's initial state, so the product starts where
 * the user left off instead of at factory settings.
 */
export async function computeUserDefaults(userId: string): Promise<UserDefaults> {
  const empty: UserDefaults = { style: null, aspectRatio: null, voiceId: null, basedOnVideos: 0 };
  try {
    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { metadata: true },
    });

    const tally = { style: new Map<string, number>(), aspect: new Map<string, number>(), voice: new Map<string, number>() };
    let counted = 0;

    for (const v of videos) {
      let request: any;
      try {
        request = JSON.parse(v.metadata ?? '{}')?.request;
      } catch {
        continue;
      }
      if (!request) continue;
      counted += 1;
      const bump = (map: Map<string, number>, key: unknown) => {
        if (typeof key === 'string' && key) map.set(key, (map.get(key) ?? 0) + 1);
      };
      bump(tally.style, request.style);
      bump(tally.aspect, request.aspectRatio);
      bump(tally.voice, request.voiceId);
    }

    const top = (map: Map<string, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      style: top(tally.style),
      aspectRatio: top(tally.aspect),
      voiceId: top(tally.voice),
      basedOnVideos: counted,
    };
  } catch (error) {
    console.error('[ProductLoop] Defaults lookup failed:', error);
    return empty;
  }
}

export interface ProductInsights {
  windowDays: number;
  generations: number;
  failures: number;
  /** FAILED / all generations — the single most important quality number. */
  failureRate: number;
  rerenders: number;
  /** Re-renders per completed generation — how often output needs fixing. */
  rerenderRate: number;
  sceneEdits: number;
  chatEdits: number;
  clipSwaps: number;
  captionDownloads: number;
  sharesEnabled: number;
  totalAiCostUsd: number;
  avgCostPerGenerationUsd: number;
  topStyles: Array<{ style: string; count: number }>;
}

/**
 * The improvement dashboard: what breaks, what users fix by hand, what they
 * ask for. Read it, fix the biggest number, ship, repeat.
 */
export async function getProductInsights(windowDays = 30): Promise<ProductInsights> {
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

  const [events, ledger, videos] = await Promise.all([
    prisma.usageRecord.groupBy({
      by: ['action'],
      where: { timestamp: { gte: since } },
      _count: { action: true },
    }),
    prisma.aIGeneration.aggregate({
      where: { type: 'VIDEO_GENERATION', createdAt: { gte: since } },
      _sum: { cost: true },
      _count: { id: true },
    }),
    prisma.video.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, metadata: true },
    }),
  ]);

  const count = (action: string) =>
    events.find((e) => e.action === action)?._count.action ?? 0;

  const generations = count(PRODUCT_ACTIONS.generation);
  const failures = videos.filter((v) => v.status === 'FAILED').length;
  const rerenders = count(PRODUCT_ACTIONS.rerender);

  const styleTally = new Map<string, number>();
  for (const v of videos) {
    try {
      const style = JSON.parse(v.metadata ?? '{}')?.request?.style;
      if (typeof style === 'string' && style) {
        styleTally.set(style, (styleTally.get(style) ?? 0) + 1);
      }
    } catch {
      // ignore unparsable metadata
    }
  }

  const totalAiCostUsd = Number(ledger._sum.cost ?? 0);
  return {
    windowDays,
    generations,
    failures,
    failureRate: generations > 0 ? Number((failures / generations).toFixed(3)) : 0,
    rerenders,
    rerenderRate: generations > 0 ? Number((rerenders / generations).toFixed(3)) : 0,
    sceneEdits: count(PRODUCT_ACTIONS.sceneEdit),
    chatEdits: count(PRODUCT_ACTIONS.chatEdit),
    clipSwaps: count(PRODUCT_ACTIONS.clipSwap),
    captionDownloads: count(PRODUCT_ACTIONS.captionsDownload),
    sharesEnabled: count(PRODUCT_ACTIONS.shareEnabled),
    totalAiCostUsd,
    avgCostPerGenerationUsd:
      ledger._count.id > 0 ? Number((totalAiCostUsd / ledger._count.id).toFixed(6)) : 0,
    topStyles: [...styleTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([style, n]) => ({ style, count: n })),
  };
}
