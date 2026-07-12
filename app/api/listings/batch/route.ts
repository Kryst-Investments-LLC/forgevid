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
import { parseListingsFeed } from '@/lib/mls-feed';
import { FetchLimitError, SsrfError, safeFetch, withDefaultScheme } from '@/lib/safe-fetch';

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
    /** A RESO Web API (JSON) or portal (XML) feed. The agent touches nothing. */
    feedUrl: z.string().min(4).max(2048).optional(),
    duration: z.number().int().min(5).max(120).default(25),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
    voiceId: z.string().optional(),
    renderQuality: z.enum(['draft', 'full', '4k']).default('full'),
    // Parse + count only; don't render or touch quota.
    preview: z.boolean().optional(),
  })
  .refine(
    (b) => [b.csv, b.listings, b.feedUrl].filter(Boolean).length === 1,
    { message: 'Provide exactly one of `csv`, `listings` or `feedUrl`' },
  );

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
  const { csv, feedUrl, duration, aspectRatio, voiceId, renderQuality } = parsed.data;

  let listings: Listing[];
  try {
    if (feedUrl) {
      // A feed url is attacker-supplied data. It goes through the same guard as
      // every other url this product fetches.
      const { body, contentType } = await safeFetch(withDefaultScheme(feedUrl), {
        maxBytes: 8 * 1024 * 1024,
        timeoutMs: 15_000,
        acceptTypes: ['application/json', 'text/json', 'application/xml', 'text/xml', 'text'],
        headers: { Accept: 'application/json, application/xml;q=0.9' },
      });
      listings = parseListingsFeed(body.toString('utf8'), contentType);
    } else if (csv) {
      listings = parseListingsCsv(csv);
    } else {
      listings = parsed.data.listings as Listing[];
    }
  } catch (error) {
    if (error instanceof ListingParseError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof SsrfError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FetchLimitError) {
      return NextResponse.json({ error: `Could not read the feed: ${error.message}` }, { status: 422 });
    }
    console.error('[listings] feed fetch failed:', error);
    return NextResponse.json({ error: 'Could not read that feed' }, { status: 502 });
  }

  if (listings.length > MAX_LISTINGS) {
    return NextResponse.json(
      { error: `At most ${MAX_LISTINGS} listings per batch (got ${listings.length})` },
      { status: 413 },
    );
  }

  if (parsed.data.preview) {
    return NextResponse.json({
      preview: true,
      count: listings.length,
      items: listings.map((l) => ({ ref: l.ref, label: l.address, photos: l.photos.length })),
    });
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
      // The price is the reason anyone watches a listing video. Burn it in.
      lowerThird: {
        title: listing.address,
        facts: [
          listing.price,
          listing.beds ? `${listing.beds} bed` : undefined,
          listing.baths ? `${listing.baths} bath` : undefined,
        ].filter((f): f is string => Boolean(f)),
        start: 0.6,
        duration: 4.5,
      },
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
