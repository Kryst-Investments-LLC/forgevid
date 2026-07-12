import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * The signed-in user's OWN dashboard metrics.
 *
 * The dashboard previously called the admin-only /api/hypermind (site-wide
 * stats), so every non-admin user saw an error. A user's dashboard should show
 * their own real numbers, computed here from their videos.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = session.user.id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, thisMonth, completed, inProgress] = await Promise.all([
      prisma.video.count({ where: { userId } }),
      prisma.video.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
      prisma.video.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.video.count({ where: { userId, status: { in: ['PROCESSING', 'QUEUED'] } } }),
    ]);

    return NextResponse.json({
      metrics: [
        { label: 'Videos created', value: total },
        { label: 'This month', value: thisMonth },
        { label: 'Completed', value: completed },
        { label: 'In progress', value: inProgress },
      ],
      insights: [],
    });
  } catch (error) {
    console.error('[user/metrics] failed:', error);
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 });
  }
}
