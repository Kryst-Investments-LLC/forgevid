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

    const sceneList = Array.isArray(templateData.scenes) ? templateData.scenes : [];
    const sceneDuration = Math.max(3, Math.round(template.duration / Math.max(1, sceneList.length)));
    const tracks = [
      {
        id: 'template-video',
        type: 'video',
        name: 'Template scenes',
        clips: sceneList.map((scene: any, index: number) => ({
          id: `template-scene-${index + 1}`,
          assetId: String(scene?.assetId || template.thumbnail || `scene-${index + 1}`),
          startTime: index * sceneDuration,
          duration: Number(scene?.duration) || sceneDuration,
        })),
      },
      { id: 'template-audio', type: 'audio', name: 'Audio', clips: [] },
      { id: 'template-text', type: 'text', name: 'Titles and captions', clips: [] },
    ];

    // Create a useful project rather than the previous empty timeline.
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
          tracks,
          templateData,
          generationPrompt: templateData.prompt || `${template.name}: ${template.description || ''}`,
          aspectRatio: template.aspectRatio,
          createdAt: new Date().toISOString(),
        }),
      },
    });

    // These first-party signals improve ranking without ingesting private
    // project content. The catalog API already orders by aggregate usage.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await prisma.$transaction([
      prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }),
      prisma.templateAnalytics.upsert({
        where: { templateId_date: { templateId, date: today } },
        update: { uses: { increment: 1 }, clicks: { increment: 1 } },
        create: { templateId, date: today, uses: 1, clicks: 1 },
      }),
    ]);

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
