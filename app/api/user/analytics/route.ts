import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PLAN_QUOTAS } from '@/lib/quota';
import { getUserPlan } from '@/lib/plan';

/**
 * The signed-in user's REAL analytics — only metrics we actually track.
 *
 * Everything here is derived from the user's own Video rows. Untracked things
 * the old mock page invented (exports, storage GB, engagement, watch time,
 * template usage) are deliberately left out rather than faked.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = session.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last 6 calendar months, oldest first.
    const monthRanges = Array.from({ length: 6 }, (_, k) => {
      const i = 5 - k;
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      return { label: start.toLocaleString('en-US', { month: 'short' }), start, end };
    });

    const [total, thisMonth, completed, inProgress, failed, durationAgg, plan, ...monthlyCounts] =
      await Promise.all([
        prisma.video.count({ where: { userId } }),
        prisma.video.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
        prisma.video.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.video.count({ where: { userId, status: { in: ['PROCESSING', 'QUEUED'] } } }),
        prisma.video.count({ where: { userId, status: 'FAILED' } }),
        prisma.video.aggregate({ where: { userId }, _sum: { duration: true }, _avg: { duration: true } }),
        getUserPlan(userId),
        ...monthRanges.map((r) =>
          prisma.video.count({ where: { userId, createdAt: { gte: r.start, lt: r.end } } }),
        ),
      ]);

    const videoLimit = PLAN_QUOTAS[plan]?.videosPerMonth ?? PLAN_QUOTAS.free.videosPerMonth;
    const totalSeconds = durationAgg._sum.duration ?? 0;

    return NextResponse.json({
      summary: {
        total,
        thisMonth,
        completed,
        inProgress,
        failed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalMinutes: Math.round(totalSeconds / 60),
        avgSeconds: Math.round(durationAgg._avg.duration ?? 0),
      },
      usage: { plan, thisMonth, videoLimit },
      monthly: monthRanges.map((r, i) => ({ month: r.label, videos: monthlyCounts[i] })),
    });
  } catch (error) {
    console.error('[user/analytics] failed:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
