import { prisma } from '@/lib/prisma';

export async function getAnalyticsInsights(userId: string) {
  const insights = await prisma.usageRecord.groupBy({
    by: ['action'],
    where: { userId },
    _count: { action: true },
  });
  return insights;
}
