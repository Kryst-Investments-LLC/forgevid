/**
 * The shared "render one video per feed item" loop.
 *
 * Real estate, automotive, and e-commerce all do exactly the same thing per
 * item: check quota, pull the item's photos through the SSRF guard into
 * ownership-checked MediaAssets, then start a `mediaOnly` generation with a
 * burned-in lower third. Only the prompt and the lower third differ, so those
 * are the two things a caller supplies; everything else lives here, once.
 *
 * A failing item is reported by its reference and never takes the batch down.
 *
 * Relative imports only — reachable from route handlers (server components).
 */

import { prisma } from './prisma';
import { enqueueGeneration } from './video-queue';
import { runGeneration } from './generation-pipeline';
import { withRenderSlot } from './render-semaphore';
import { checkGenerationQuota, recordGenerationUsage } from './quota';
import { importSiteImages } from './site-images';
import { DEFAULT_TRANSITION } from './transitions';
import type { AspectRatio } from './video-generator';
import type { LowerThird } from './lower-third';

export interface FeedItem {
  /** The caller's own id for this item, echoed back in the result. */
  ref: string;
  /** A human name for logs and errors ("14 Maple Court", "2022 RAV4"). */
  label: string;
  /** Photo URLs, in order. */
  photos: string[];
  /** Facts-only prompt built from `photoCount` real images. */
  buildPrompt: (photoCount: number) => string;
  /** The address/price/spec bar for the opening seconds. */
  lowerThird: (photoCount: number) => LowerThird;
}

export interface FeedBatchOptions {
  userId: string;
  duration: number;
  aspectRatio: AspectRatio;
  voiceId: string;
  renderQuality: 'draft' | 'full' | '4k';
  addOns?: string[];
  maxPhotosPerItem?: number;
}

export interface FeedBatchResult {
  ref: string;
  label: string;
  videoId?: string;
  photosUsed?: number;
  error?: string;
}

export async function runFeedBatch(
  items: FeedItem[],
  opts: FeedBatchOptions,
): Promise<{ started: number; failed: number; results: FeedBatchResult[] }> {
  const maxPhotos = opts.maxPhotosPerItem ?? 12;
  const results: FeedBatchResult[] = [];

  for (const item of items) {
    const result: FeedBatchResult = { ref: item.ref, label: item.label };

    // Quota per item: a 25-item batch must not let a user render 25 videos on a
    // plan that allows five.
    const quota = await checkGenerationQuota(opts.userId, opts.duration);
    if (!quota.allowed) {
      result.error = quota.reason ?? 'Quota exceeded';
      results.push(result);
      continue;
    }

    // Photos are feed-supplied URLs, so they go through the SSRF guard and land
    // as MediaAssets this user owns. Order is preserved.
    const images = await importSiteImages(opts.userId, item.photos, maxPhotos);
    if (images.length === 0) {
      result.error = 'None of the photos could be fetched';
      results.push(result);
      continue;
    }

    const input = {
      prompt: item.buildPrompt(images.length),
      style: 'professional',
      duration: opts.duration,
      addOns: opts.addOns ?? ['voiceover', 'subtitles', 'music'],
      aspectRatio: opts.aspectRatio,
      voiceId: opts.voiceId,
      transition: DEFAULT_TRANSITION,
      mediaAssetIds: images.map((i) => i.assetId),
      // The video shows THIS item. Never pad it with stock footage.
      mediaOnly: true,
      renderQuality: opts.renderQuality,
      lowerThird: item.lowerThird(images.length),
    };

    try {
      const video = await prisma.video.create({
        data: {
          title: item.label.slice(0, 80),
          description: `Feed item ${item.ref}`,
          status: 'QUEUED',
          duration: opts.duration,
          format: 'mp4',
          userId: opts.userId,
          metadata: JSON.stringify({
            generation: { stage: 'queued', percent: 5, updatedAt: new Date().toISOString() },
            request: input,
            item: { ref: item.ref, label: item.label },
          }),
        },
        select: { id: true },
      });

      await recordGenerationUsage(opts.userId, video.id, opts.duration);

      const jobId = await enqueueGeneration({ videoId: video.id, userId: opts.userId, input });
      if (!jobId) {
        void withRenderSlot(() => runGeneration(video.id, input)).catch((err) =>
          console.error(`[feed-batch] ${item.ref} failed:`, err instanceof Error ? err.message : err),
        );
      }
      result.videoId = video.id;
      result.photosUsed = images.length;
    } catch (error) {
      console.error(`[feed-batch] ${item.ref} could not start:`, error);
      result.error = 'Could not start the generation';
    }

    results.push(result);
  }

  const started = results.filter((r) => r.videoId).length;
  return { started, failed: results.length - started, results };
}
