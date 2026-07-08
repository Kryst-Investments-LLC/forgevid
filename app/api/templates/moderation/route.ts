import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Template Moderation API
 * POST: Submit template for moderation or moderate a template
 * GET: Get moderation queue
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, action, reason } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Check if user is admin/moderator
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isModerator = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

    // If action is provided, this is a moderation action
    if (action && isModerator) {
      const validActions = ['approve', 'reject', 'flag'];
      if (!validActions.includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      // Update moderation record
      const moderation = await prisma.templateModeration.updateMany({
        where: { templateId },
        data: {
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
          moderatorId: session.user.id,
          rejectionReason: action === 'reject' ? reason : null,
          moderatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update template moderation status
      await prisma.template.update({
        where: { id: templateId },
        data: { moderationStatus: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged' },
      });

      return NextResponse.json({
        success: true,
        message: `Template ${action}d successfully`,
      });
    } else if (!action) {
      // This is a submission for moderation (user generated template)
      const moderation = await prisma.templateModeration.upsert({
        where: { templateId },
        update: {
          status: 'pending',
          updatedAt: new Date(),
        },
        create: {
          templateId,
          status: 'pending',
        },
      });

      await prisma.template.update({
        where: { id: templateId },
        data: { moderationStatus: 'pending' },
      });

      return NextResponse.json({
        success: true,
        message: 'Template submitted for moderation',
      });
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  } catch (error) {
    console.error('[Template Moderation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to moderate template' },
      { status: 500 }
    );
  }
}

async function handleGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Check if user is admin/moderator
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isModerator = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  if (!isModerator) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const moderationQueue = await prisma.templateModeration.findMany({
      where: { status },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail: true,
            category: true,
            createdAt: true,
          },
        },
        moderator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ queue: moderationQueue });
  } catch (error) {
    console.error('[Template Moderation Queue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation queue' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);
export const GET = securityConfigs.authenticated(handleGet);

