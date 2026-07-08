import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Editor API - Handle video editing operations
 * GET: Get editor state/project
 * POST: Update editor state/project
 * DELETE: Delete project/clip
 */

interface EditorProject {
  videoId: string;
  tracks: Array<{
    id: string;
    type: 'video' | 'audio' | 'text';
    clips: Array<{
      id: string;
      assetId: string;
      startTime: number;
      duration: number;
      trimStart?: number;
      trimEnd?: number;
    }>;
  }>;
}

async function handleGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    // Get video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId: session.user.id },
      include: { edits: true, exports: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Get editor project data if it exists
    const projectData = video.metadata ? JSON.parse(video.metadata) : null;

    return NextResponse.json({
      success: true,
      project: {
        videoId,
        tracks: projectData?.tracks || [],
        video,
      },
    });
  } catch (error) {
    console.error('[Editor API] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to load project' },
      { status: 500 }
    );
  }
}

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoId, tracks, operation } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId: session.user.id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (operation === 'save') {
      // Save editor state to video metadata
      await prisma.video.update({
        where: { id: videoId },
        data: {
          metadata: JSON.stringify({ tracks, lastEdited: new Date().toISOString() }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Project saved successfully',
      });
    }

    if (operation === 'addClip') {
      const { trackId, clipData } = body;
      
      // Add clip operation
      const currentMetadata = video.metadata ? JSON.parse(video.metadata) : { tracks: [] };
      const newMetadata = {
        ...currentMetadata,
        tracks: currentMetadata.tracks.map((track: any) =>
          track.id === trackId
            ? { ...track, clips: [...track.clips, clipData] }
            : track
        ),
      };

      await prisma.video.update({
        where: { id: videoId },
        data: { metadata: JSON.stringify(newMetadata) },
      });

      return NextResponse.json({
        success: true,
        message: 'Clip added successfully',
      });
    }

    return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
  } catch (error) {
    console.error('[Editor API] Post error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export const GET = securityConfigs.authenticated(handleGet);
export const POST = securityConfigs.authenticated(handlePost);

