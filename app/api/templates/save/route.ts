import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Save as Template API - Save video project as reusable template
 * POST: Create a template from current editor state
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoId, name, description, category, isPublic } = body;

    if (!videoId || !name) {
      return NextResponse.json({ error: 'Video ID and template name required' }, { status: 400 });
    }

    // Get video and verify ownership
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId: session.user.id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Parse video metadata to extract template data
    const projectData = video.metadata ? JSON.parse(video.metadata) : null;

    if (!projectData || !projectData.tracks) {
      return NextResponse.json({ error: 'No project data found in video' }, { status: 400 });
    }

    // Create template from video project
    const template = await prisma.template.create({
      data: {
        name,
        description: description || video.description || 'User-created template',
        category: category || 'BUSINESS',
        duration: video.duration || 30,
        aspectRatio: '16:9',
        resolution: video.resolution || '1080p',
        tags: projectData.tags || 'custom,user-generated',
        thumbnail: video.thumbnail || '/placeholder.svg',
        templateData: JSON.stringify({
          tracks: projectData.tracks,
          style: projectData.style || 'custom',
          music: projectData.music || 'neutral',
          scenes: projectData.scenes || [],
          sourceVideoId: videoId,
        }),
        isPublic: isPublic || false,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Template saved successfully',
    });
  } catch (error) {
    console.error('[Save Template] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save template' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);

