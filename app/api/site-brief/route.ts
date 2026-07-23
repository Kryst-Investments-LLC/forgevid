import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extractSite } from '@/lib/site-extract';
import { importSiteImages, saveScreenshots } from '@/lib/site-images';
import { FetchLimitError, SsrfError, withDefaultScheme } from '@/lib/safe-fetch';
import {
  COMMERCIAL_TONES,
  scriptToGenerationPrompt,
  writeCommercialScript,
} from '@/lib/commercial-script';
import { hasLlmKey } from '@/lib/ai/llm';

/**
 * POST /api/site-brief — paste a URL, get a commercial script.
 *
 * Read the page (SSRF-guarded), have GPT write a grounded script, and import
 * the page's own hero images as the user's MediaAssets so they can be used as
 * scenes. Returns a ready-to-edit prompt; the user still presses Generate.
 *
 * This endpoint makes the server fetch a user-supplied URL, so beyond the
 * guards in lib/safe-fetch it is authenticated and rate-limited per user —
 * ForgeVid must not become an open proxy or a port scanner.
 */

export const dynamic = 'force-dynamic';

const SITE_BRIEF_ACTION = 'site_brief';
const HOURLY_LIMIT = 20;

const bodySchema = z.object({
  url: z.string().min(4).max(2048),
  duration: z.number().int().min(5).max(120).default(30),
  tone: z.enum(COMMERCIAL_TONES).default('professional'),
  importImages: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!hasLlmKey()) {
    return NextResponse.json(
      { error: 'Script writing is unavailable (no LLM key: set OPENAI_API_KEY or GEMINI_API_KEY)' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { url, duration, tone, importImages } = parsed.data;

  // Per-user hourly cap on server-side fetches. Fail CLOSED on a DB error:
  // an unmetered SSRF surface is worse than a temporarily unavailable feature.
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.usageRecord.count({
      where: { userId, action: SITE_BRIEF_ACTION, timestamp: { gte: since } },
    });
    if (recent >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: `Too many site imports this hour (limit ${HOURLY_LIMIT}). Try again later.` },
        { status: 429 },
      );
    }
  } catch (error) {
    console.error('[site-brief] rate-limit check failed:', error);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  const candidate = withDefaultScheme(url);

  let content;
  try {
    content = await extractSite(candidate);
  } catch (error) {
    if (error instanceof SsrfError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FetchLimitError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('[site-brief] fetch failed:', error);
    return NextResponse.json(
      { error: 'Could not read that page. Check the URL and try again.' },
      { status: 502 },
    );
  }

  if (content.sparse) {
    return NextResponse.json(
      {
        error:
          'That page had almost no readable text — it may render entirely in the browser. ' +
          'Try the marketing/landing page, or describe the product yourself.',
        sparse: true,
      },
      { status: 422 },
    );
  }

  await prisma.usageRecord
    .create({
      data: {
        userId,
        action: SITE_BRIEF_ACTION,
        resourceType: 'url',
        metadata: JSON.stringify({ host: new URL(content.sourceUrl).hostname }),
      },
    })
    .catch((error) => console.error('[site-brief] usage record failed:', error));

  let script;
  try {
    script = await writeCommercialScript(content, { duration, tone });
  } catch (error) {
    console.error('[site-brief] scriptwriter failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not write a script' },
      { status: 502 },
    );
  }

  // Best-effort: a script with no imported images still generates (stock footage).
  // Screenshots of the live product (headless) are the strongest footage, so
  // they lead; the page's og:images follow.
  let images: Awaited<ReturnType<typeof importSiteImages>> = [];
  if (importImages) {
    const shots = content.screenshots?.length
      ? await saveScreenshots(userId, content.screenshots, content.sourceUrl)
      : [];
    const fromMeta = await importSiteImages(userId, content.images);
    images = [...shots, ...fromMeta];
  }

  return NextResponse.json({
    sourceUrl: content.sourceUrl,
    brand: script.brand,
    tagline: script.tagline,
    narration: script.narration,
    beats: script.beats,
    callToAction: script.callToAction,
    /** Drop straight into the generation prompt box. */
    prompt: scriptToGenerationPrompt(script),
    /** Pass as mediaAssetIds to put the product's own visuals on screen. */
    mediaAssetIds: images.map((i) => i.assetId),
    images,
    extracted: {
      title: content.title,
      description: content.description,
      headings: content.headings.slice(0, 5),
      imagesFound: content.images.length,
      renderedWith: content.renderedWith,
      screenshots: content.screenshots?.length ?? 0,
    },
  });
}
