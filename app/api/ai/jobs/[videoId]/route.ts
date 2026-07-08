import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Generation job status.
 *
 * GET /api/ai/jobs/[videoId] — returns the current stage/percent for a
 * generation, read from the Video row (single source of truth for both the
 * BullMQ-worker and inline execution paths). The client polls this to drive a
 * real progress bar instead of a fake timer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { videoId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.videoId },
    select: {
      id: true,
      userId: true,
      status: true,
      url: true,
      fileUrl: true,
      thumbnail: true,
      duration: true,
      metadata: true,
    },
  });

  if (!video || video.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let generation: any = null;
  try {
    generation = video.metadata ? JSON.parse(video.metadata).generation ?? null : null;
  } catch {
    generation = null;
  }

  const done = video.status === 'COMPLETED';
  const videoUrl = video.fileUrl || video.url || generation?.videoUrl || null;

  return NextResponse.json({
    videoId: video.id,
    status: video.status, // PROCESSING | COMPLETED | FAILED | CANCELLED
    stage: generation?.stage ?? (done ? 'done' : 'queued'),
    percent: typeof generation?.percent === 'number' ? generation.percent : done ? 100 : 0,
    videoUrl: done ? videoUrl : null,
    thumbnail: video.thumbnail ?? null,
    error: video.status === 'FAILED' ? generation?.error ?? 'Generation failed' : null,
  });
}
