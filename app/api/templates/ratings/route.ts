import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { securityConfigs } from '@/lib/api-security';
import { Decimal } from 'decimal.js';

/**
 * Template Ratings API
 * POST: Add or update a rating
 * GET: Get ratings for a template
 */

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, rating, comment } = body;

    if (!templateId || !rating) {
      return NextResponse.json({ error: 'Template ID and rating required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Upsert rating (update if exists, create if not)
    const templateRating = await prisma.templateRating.upsert({
      where: {
        templateId_userId: {
          templateId,
          userId: session.user.id,
        },
      },
      update: {
        rating,
        comment: comment || null,
        updatedAt: new Date(),
      },
      create: {
        templateId,
        userId: session.user.id,
        rating,
        comment: comment || null,
      },
    });

    // Update template aggregate stats
    const aggregateRating = await prisma.templateRating.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.template.update({
      where: { id: templateId },
      data: {
        averageRating: aggregateRating._avg.rating ? new Decimal(aggregateRating._avg.rating) : null,
        totalRatings: aggregateRating._count.rating || 0,
      },
    });

    return NextResponse.json({
      success: true,
      rating: templateRating,
      message: 'Rating saved successfully',
    });
  } catch (error) {
    console.error('[Template Rating] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save rating' },
      { status: 500 }
    );
  }
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  try {
    const ratings = await prisma.templateRating.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      take: 50, // Limit to most recent 50 ratings
    });

    const aggregateRating = await prisma.templateRating.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return NextResponse.json({
      ratings,
      aggregate: {
        average: aggregateRating._avg.rating || 0,
        count: aggregateRating._count.rating || 0,
      },
    });
  } catch (error) {
    console.error('[Template Ratings] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);
export const GET = handleGet;

