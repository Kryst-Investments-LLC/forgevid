import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Use Template API - Load a template into editor
 * POST: Create a video project from a template
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Get template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Parse template data
    const templateData = template.templateData ? JSON.parse(template.templateData) : {};

    // Create a new video project from template
    const video = await prisma.video.create({
      data: {
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description || '',
        userId: session.user.id,
        status: 'DRAFT',
        duration: template.duration,
        resolution: template.resolution,
        format: 'mp4',
        metadata: JSON.stringify({
          isFromTemplate: true,
          templateId: template.id,
          templateName: template.name,
          tracks: [], // Initialize with empty tracks, user can add clips
          createdAt: new Date().toISOString(),
        }),
      },
    });

    // Increment template usage count
    await prisma.template.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      videoId: video.id,
      message: 'Template loaded successfully',
    });
  } catch (error) {
    console.error('[Use Template] Error:', error);
    return NextResponse.json(
      { error: 'Failed to use template' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);

