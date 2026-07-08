import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Return authenticated user's videos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        thumbnail: true,
        duration: true,
        fileSize: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

const createVideoSchema = z.object({
  title: z.string().min(1).max(120).default('Untitled Video'),
  description: z.string().max(2000).optional(),
});

/**
 * POST /api/videos — create an empty editor project (a DRAFT).
 *
 * This is NOT how videos get generated (that's POST /api/ai) or uploaded
 * (POST /api/videos/upload). It exists so the editor can start from a blank
 * timeline.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const parsed = createVideoSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const video = await prisma.video.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? '',
        status: 'DRAFT',
        format: 'mp4',
        userId: session.user.id,
        metadata: JSON.stringify({ tracks: [] }),
      },
      select: { id: true, title: true, status: true, createdAt: true },
    });
    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error('[videos] create error');
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 });
  }
}