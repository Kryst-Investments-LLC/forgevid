import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';

/**
 * Template Analytics API
 * GET: Get analytics for templates
 */

async function handleGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Check if user owns this template or is admin
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { createdById: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const canView = template?.createdById === session.user.id || user?.role === 'ADMIN';

    if (!canView) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Fetch analytics
    const where: any = { templateId };
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const analytics = await prisma.templateAnalytics.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = analytics.reduce(
      (acc, data) => ({
        views: acc.views + data.views,
        clicks: acc.clicks + data.clicks,
        uses: acc.uses + data.uses,
        favorites: acc.favorites + data.favorites,
      }),
      { views: 0, clicks: 0, uses: 0, favorites: 0 }
    );

    return NextResponse.json({
      analytics,
      totals,
    });
  } catch (error) {
    console.error('[Template Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export const GET = securityConfigs.authenticated(handleGet);

