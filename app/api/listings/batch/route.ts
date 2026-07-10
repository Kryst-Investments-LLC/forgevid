import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enqueueGeneration } from '@/lib/video-queue';
import { runGeneration } from '@/lib/generation-pipeline';
import { withRenderSlot } from '@/lib/render-semaphore';
import { checkGenerationQuota, recordGenerationUsage } from '@/lib/quota';
import { importSiteImages } from '@/lib/site-images';
import { DEFAULT_TRANSITION } from '@/lib/transitions';
import { resolveVoiceIdForUser } from '@/lib/cloned-voices';
import {
  ListingParseError,
  listingPrompt,
  parseListingsCsv,
  type Listing,
} from '@/lib/listing-brief';

/**
 * POST /api/listings/batch — an estate agent's whole spreadsheet at once.
 *
 * Accepts either a CSV (the thing agents actually have) or a JSON array, then
 * for each listing: pulls the photos through the SSRF guard into ownership-
 * checked MediaAssets, builds a fact-only prompt, and starts a generation with
 * `mediaOnly` so the video shows THAT house and nothing else.
 *
 * Every listing is charged and quota-checked individually. A row that fails —
 * an unreachable photo, an exhausted quota — is reported by reference and does
 * not take the rest of the batch down with it.
 */

export const dynamic = 'force-dynamic';

const MAX_LISTINGS = 25;
const MAX_PHOTOS_PER_LISTING = 12;

const listingSchema = z.object({
  ref: z.string().min(1).max(120),
  address: z.string().min(1).max(300),
  price: z.string().max(60).optional(),
  beds: z.number().int().min(0).max(50).optional(),
  baths: z.number().int().min(0).max(50).optional(),
  highlights: z.string().max(1000).optional(),
  photos: z.array(z.string().min(4)).min(1).max(MAX_PHOTOS_PER_LISTING),
});

const bodySchema = z
  .object({
    csv: z.string().min(10).max(200_000).optional(),
    listings: z.array(listingSchema).min(1).max(MAX_LISTINGS).optional(),
    duration: z.number().int().min(5).max(120).default(25),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
    voiceId: z.string().optional(),
    renderQuality: z.enum(['draft', 'full', '4k']).default('full'),
  })
  .refine((b) => Boolean(b.csv) !== Boolean(b.listings), {
    message: 'Provide either `csv` or `listings`, not both',
  });

interface BatchResult {
  ref: string;
  address: string;
  videoId?: string;
  photosUsed?: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { csv, duration, aspectRatio, voiceId, renderQuality } = parsed.data;

  let listings: Listing[];
  try {
    listings = csv ? parseListingsCsv(csv) : (parsed.data.listings as Listing[]);
  } catch (error) {
    if (error instanceof ListingParseError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }

  if (listings.length > MAX_LISTINGS) {
    return NextResponse.json(
      { error: `At most ${MAX_LISTINGS} listings per batch (got ${listings.length})` },
      { status: 413 },
    );
  }

  // Resolve the voice once — it is the same narrator for the whole batch.
  const resolvedVoiceId = await resolveVoiceIdForUser(userId, voiceId);
  const results: BatchResult[] = [];

  for (const listing of listings) {
    const result: BatchResult = { ref: listing.ref, address: listing.address };

    // Quota is per generation, checked per listing: a batch of twenty must not
    // let a user render twenty videos on a plan that allows five.
    const quota = await checkGenerationQuota(userId, duration);
    if (!quota.allowed) {
      result.error = quota.reason ?? 'Quota exceeded';
      results.push(result);
      continue;
    }

    // Photos are agent-supplied URLs, so they go through the SSRF guard and
    // land as MediaAssets this user owns. Order is preserved.
    const images = await importSiteImages(userId, listing.photos, MAX_PHOTOS_PER_LISTING);
    if (images.length === 0) {
      result.error = 'None of the photos could be fetched';
      results.push(result);
      continue;
    }

    const input = {
      prompt: listingPrompt(listing, images.length),
      style: 'professional',
      duration,
      addOns: ['voiceover', 'subtitles'],
      aspectRatio,
      voiceId: resolvedVoiceId,
      transition: DEFAULT_TRANSITION,
      mediaAssetIds: images.map((i) => i.assetId),
      // The listing shows THIS house. Never pad it with stock footage.
      mediaOnly: true,
      renderQuality,
    };

    try {
      const video = await prisma.video.create({
        data: {
          title: listing.address.slice(0, 80),
          description: `Listing ${listing.ref}`,
          status: 'QUEUED',
          duration,
          format: 'mp4',
          userId,
          metadata: JSON.stringify({
            generation: { stage: 'queued', percent: 5, updatedAt: new Date().toISOString() },
            request: input,
            listing: { ref: listing.ref, address: listing.address },
          }),
        },
        select: { id: true },
      });

      await recordGenerationUsage(userId, video.id, duration);

      const jobId = await enqueueGeneration({ videoId: video.id, userId, input });
      if (!jobId) {
        void withRenderSlot(() => runGeneration(video.id, input)).catch((err) =>
          console.error(`[listings] ${listing.ref} failed:`, err instanceof Error ? err.message : err),
        );
      }

      result.videoId = video.id;
      result.photosUsed = images.length;
    } catch (error) {
      console.error(`[listings] ${listing.ref} could not start:`, error);
      result.error = 'Could not start the generation';
    }

    results.push(result);
  }

  const started = results.filter((r) => r.videoId).length;
  return NextResponse.json({
    started,
    failed: results.length - started,
    results,
    message: `Started ${started} of ${results.length} listing videos. Poll /api/ai/jobs/{videoId} for each.`,
  });
}
