import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_QUOTAS } from '@/lib/quota';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // The Subscription table is the source of truth: the Stripe webhook writes
    // it and getUserPlan reads it. The legacy User.subscription JSON column is
    // never written by the webhook, so reading it always reported "free".
    const sub = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    });

    const subscription = sub
      ? {
          planId: sub.plan,
          status: String(sub.status).toLowerCase(),
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : {
          planId: 'free',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        };

    // Real usage: videos created this month vs. the plan's monthly quota.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const videosThisMonth = await prisma.video.count({
      where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
    });
    const quota = PLAN_QUOTAS[subscription.planId as keyof typeof PLAN_QUOTAS] ?? PLAN_QUOTAS.free;

    return NextResponse.json({
      subscription,
      usage: { videosThisMonth, videoLimit: quota.videosPerMonth },
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}