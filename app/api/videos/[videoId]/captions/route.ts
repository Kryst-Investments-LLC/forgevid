import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireVideoOwner } from '@/lib/video-access';
import { cuesToSrt, cuesToVtt, type CaptionCue } from '@/lib/captions';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * GET /api/videos/[videoId]/captions?format=srt|vtt|json
 *
 * Serves the caption cues burned into the video (transcribed from the narration
 * when a voiceover exists, otherwise one cue per scene).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ videoId: string }> }) {
  const params = await props.params;
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const format = (new URL(req.url).searchParams.get('format') ?? 'srt').toLowerCase();
  if (!['srt', 'vtt', 'json'].includes(format)) {
    return NextResponse.json({ error: 'format must be srt, vtt, or json' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.videoId },
    select: { metadata: true, title: true },
  });

  let cues: CaptionCue[] = [];
  try {
    const parsed = JSON.parse(video?.metadata ?? '{}');
    if (Array.isArray(parsed?.captions)) cues = parsed.captions;
  } catch {
    cues = [];
  }

  if (cues.length === 0) {
    return NextResponse.json({ error: 'This video has no captions' }, { status: 404 });
  }

  if (format === 'json') return NextResponse.json({ cues });

  await recordProductEvent(access.userId, PRODUCT_ACTIONS.captionsDownload, {
    videoId: params.videoId,
    format,
  });

  const body = format === 'vtt' ? cuesToVtt(cues) : cuesToSrt(cues);
  const filename = `${(video?.title ?? 'captions').replace(/[^\w.-]+/g, '_').slice(0, 60)}.${format}`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': format === 'vtt' ? 'text/vtt; charset=utf-8' : 'application/x-subrip; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
