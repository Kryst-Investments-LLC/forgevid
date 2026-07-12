import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
    });

    const subscription = sub
      ? {
          planId: sub.plan,
          status: String(sub.status).toLowerCase(),
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        }
      : {
          planId: 'free',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}