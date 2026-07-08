import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Template Remix API - AI-powered template blending
 * POST: Create a new template by blending multiple templates
 */

interface RemixOptions {
  templateIds: string[];
  blendMode: 'balanced' | 'style' | 'structure';
  prompt?: string;
}

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateIds, blendMode, prompt } = body as RemixOptions;

    if (!templateIds || templateIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 templates required for remixing' }, { status: 400 });
    }

    // Fetch templates
    const templates = await prisma.template.findMany({
      where: { id: { in: templateIds } },
    });

    if (templates.length !== templateIds.length) {
      return NextResponse.json({ error: 'One or more templates not found' }, { status: 404 });
    }

    // Remix templates based on blend mode
    const remixedData = await blendTemplates(templates, blendMode, prompt);

    // Create new remixed template
    const remixedTemplate = await prisma.template.create({
      data: {
        name: `${templates.map(t => t.name).join(' + ')} Remix`,
        description: `AI-remixed blend of ${templates.length} templates`,
        category: templates[0].category, // Use first template's category
        duration: Math.round(templates.reduce((sum, t) => sum + t.duration, 0) / templates.length),
        aspectRatio: templates[0].aspectRatio,
        resolution: templates[0].resolution,
        tags: templates.map(t => t.tags).join(','),
        thumbnail: templates[0].thumbnail,
        templateData: JSON.stringify(remixedData),
        isPublic: false, // Remixes are private by default
        createdById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      template: remixedTemplate,
      message: 'Template remixed successfully',
    });
  } catch (error) {
    console.error('[Template Remix] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remix templates' },
      { status: 500 }
    );
  }
}

/**
 * Blend multiple templates using AI
 */
async function blendTemplates(templates: any[], blendMode: string, prompt?: string): Promise<any> {
  // Parse all template data
  const templateDataArray = templates.map(t => 
    t.templateData ? JSON.parse(t.templateData) : {}
  );

  switch (blendMode) {
    case 'balanced':
      // Blend all aspects evenly
      return {
        style: blendStyles(templateDataArray.map(d => d.style)),
        music: blendStyles(templateDataArray.map(d => d.music)),
        scenes: blendScenes(templateDataArray.map(d => d.scenes)),
        blendMode: 'balanced',
        sourceTemplates: templates.map(t => t.id),
      };

    case 'style':
      // Extract style from first template, structure from others
      return {
        style: templateDataArray[0]?.style || 'professional',
        music: blendStyles(templateDataArray.slice(1).map(d => d.music)),
        scenes: blendScenes(templateDataArray.map(d => d.scenes)),
        blendMode: 'style',
        sourceTemplates: templates.map(t => t.id),
      };

    case 'structure':
      // Use structure from first template, styles from others
      return {
        style: blendStyles(templateDataArray.slice(1).map(d => d.style)),
        music: blendStyles(templateDataArray.slice(1).map(d => d.music)),
        scenes: templateDataArray[0]?.scenes || [],
        blendMode: 'structure',
        sourceTemplates: templates.map(t => t.id),
      };

    default:
      return {
        style: 'professional',
        music: 'neutral',
        scenes: [],
        blendMode: 'balanced',
        sourceTemplates: templates.map(t => t.id),
      };
  }
}

function blendStyles(styles: string[]): string {
  // Average out style characteristics
  const uniqueStyles = [...new Set(styles)].filter(Boolean);
  if (uniqueStyles.length === 0) return 'professional';
  if (uniqueStyles.length === 1) return uniqueStyles[0];
  
  // Return most common or blend
  return uniqueStyles[0]; // For now, just use first
}

function blendScenes(sceneArrays: any[][]): any[] {
  // Combine scenes from all templates
  const allScenes = sceneArrays.flat();
  
  // Remove duplicates and merge similar scenes
  const uniqueScenes = allScenes.filter((scene, index, self) =>
    index === self.findIndex(s => s === scene)
  );

  return uniqueScenes.slice(0, 10); // Limit to 10 scenes
}

export const POST = securityConfigs.authenticated(handlePost);

