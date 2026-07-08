import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Template Favorites API
 * POST: Add or remove favorite
 * GET: Get user's favorites or check if template is favorited
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, action } = body; // action: "add" or "remove"

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    if (action === 'add') {
      // Add favorite
      const favorite = await prisma.templateFavorite.create({
        data: {
          templateId,
          userId: session.user.id,
        },
      });

      // Update template favorite count
      await prisma.template.update({
        where: { id: templateId },
        data: {
          favoriteCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        favorite,
        message: 'Template added to favorites',
      });
    } else if (action === 'remove') {
      // Remove favorite
      await prisma.templateFavorite.deleteMany({
        where: {
          templateId,
          userId: session.user.id,
        },
      });

      // Update template favorite count
      await prisma.template.update({
        where: { id: templateId },
        data: {
          favoriteCount: { decrement: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Template removed from favorites',
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "add" or "remove"' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Template Favorite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite' },
      { status: 500 }
    );
  }
}

async function handleGet(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');
  const userId = session.user.id;

  try {
    if (templateId) {
      // Check if the authenticated user has favorited the template.
      const favorite = await prisma.templateFavorite.findUnique({
        where: {
          templateId_userId: {
            templateId,
            userId,
          },
        },
      });

      return NextResponse.json({ isFavorite: !!favorite });
    } else {
      // Get all favorites for the authenticated user.
      const favorites = await prisma.templateFavorite.findMany({
        where: { userId },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              description: true,
              thumbnail: true,
              category: true,
              duration: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ favorites });
    }
  } catch (error) {
    console.error('[Template Favorites] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);
export const GET = securityConfigs.authenticated(handleGet);

