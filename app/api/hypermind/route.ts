import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac';

function formatAvgDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export async function GET() {
  try {
    const user = await getFreshSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Run ALL queries in parallel instead of sequentially
    const [
      videoCount,
      avgDurationAgg,
      userCount,
      ticketCount,
      analyticsAgg,
      userAnalyticsAgg,
      usageAgg0,
      usageAgg1,
      usageAgg2,
      activeRooms,
      totalRooms,
      totalMessages,
      totalEdits,
      aiAgg,
      mostViewed,
      mostShared,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.video.aggregate({ _avg: { duration: true } }),
      prisma.user.count(),
      prisma.supportTicket.count(),
      prisma.videoAnalytics.aggregate({
        _sum: { views: true, shares: true, downloads: true, duration: true },
      }),
      prisma.userAnalytics.aggregate({
        _sum: {
          videosCreated: true,
          aiGenerations: true,
          exportsGenerated: true,
          collaborationTime: true,
        },
      }),
      prisma.usageRecord.aggregate({ where: { action: 'video_created' }, _sum: { quantity: true } }),
      prisma.usageRecord.aggregate({ where: { action: 'ai_generation' }, _sum: { quantity: true } }),
      prisma.usageRecord.aggregate({ where: { action: 'export' }, _sum: { quantity: true } }),
      prisma.collaborationRoom.count({ where: { isActive: true } }),
      prisma.collaborationRoom.count(),
      prisma.collaborationMessage.count(),
      prisma.collaborationEdit.count(),
      prisma.aIGeneration.aggregate({
        _count: { id: true },
        _sum: { tokensUsed: true, cost: true },
      }),
      prisma.videoAnalytics.findFirst({
        orderBy: { views: 'desc' },
        select: { views: true, video: { select: { title: true } } },
      }),
      prisma.videoAnalytics.findFirst({
        orderBy: { shares: 'desc' },
        select: { shares: true, video: { select: { title: true } } },
      }),
    ]);

    const avgDuration = avgDurationAgg._avg.duration || 0;
    const totalViews = analyticsAgg._sum.views || 0;
    const totalShares = analyticsAgg._sum.shares || 0;
    const totalDownloads = analyticsAgg._sum.downloads || 0;
    const totalWatchTime = analyticsAgg._sum.duration || 0;
    const videosCreated = userAnalyticsAgg._sum.videosCreated || 0;
    const aiGenerations = userAnalyticsAgg._sum.aiGenerations || 0;
    const exportsGenerated = userAnalyticsAgg._sum.exportsGenerated || 0;
    const collaborationTime = userAnalyticsAgg._sum.collaborationTime || 0;
    const aiGenerationsTotal = aiAgg._count.id || 0;
    const aiTokensUsed = aiAgg._sum.tokensUsed || 0;
    const aiCost = aiAgg._sum.cost || 0;

    const metrics = [
      { label: 'Videos Generated', value: videoCount },
      { label: 'Active Users', value: userCount },
      { label: 'Avg. Render Time', value: formatAvgDuration(avgDuration) },
      { label: 'Support Tickets', value: ticketCount },
      { label: 'Total Views', value: totalViews },
      { label: 'Total Shares', value: totalShares },
      { label: 'Total Downloads', value: totalDownloads },
      { label: 'Total Watch Time', value: formatAvgDuration(totalWatchTime) },
      { label: 'Videos Created (UserAnalytics)', value: videosCreated },
      { label: 'AI Generations (UserAnalytics)', value: aiGenerations },
      { label: 'Exports Generated (UserAnalytics)', value: exportsGenerated },
      { label: 'Collaboration Time (min)', value: collaborationTime },
      { label: 'Videos Created (UsageRecord)', value: usageAgg0._sum.quantity || 0 },
      { label: 'AI Generations (UsageRecord)', value: usageAgg1._sum.quantity || 0 },
      { label: 'Exports (UsageRecord)', value: usageAgg2._sum.quantity || 0 },
      { label: 'Active Collaboration Rooms', value: activeRooms },
      { label: 'Total Collaboration Rooms', value: totalRooms },
      { label: 'Collaboration Messages', value: totalMessages },
      { label: 'Collaboration Edits', value: totalEdits },
      { label: 'AI Generations (AIGeneration)', value: aiGenerationsTotal },
      { label: 'AI Tokens Used', value: aiTokensUsed },
      { label: 'AI Cost (USD)', value: `$${aiCost.toFixed(2)}` },
    ];

    const insights = [
      mostViewed && mostViewed.video ? {
        title: 'Most Viewed Video',
        description: `${mostViewed.video.title} (${mostViewed.views} views)`,
        icon: 'MdVisibility',
      } : null,
      mostShared && mostShared.video ? {
        title: 'Most Shared Video',
        description: `${mostShared.video.title} (${mostShared.shares} shares)`,
        icon: 'MdShare',
      } : null,
    ].filter(Boolean);

    return NextResponse.json({ metrics, insights });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
