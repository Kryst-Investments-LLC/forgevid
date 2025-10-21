import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function formatAvgDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export async function GET() {
  try {
    // Videos
    const videoCount = await prisma.video.count();
    const avgDurationAgg = await prisma.video.aggregate({ _avg: { duration: true } });
    const avgDuration = avgDurationAgg._avg.duration || 0;

    // Users
    const userCount = await prisma.user.count();

    // Support tickets
    const ticketCount = await prisma.supportTicket.count();

    // Video analytics
    const analyticsAgg = await prisma.videoAnalytics.aggregate({
      _sum: { views: true, shares: true, downloads: true, duration: true },
    });
    const totalViews = analyticsAgg._sum.views || 0;
    const totalShares = analyticsAgg._sum.shares || 0;
    const totalDownloads = analyticsAgg._sum.downloads || 0;
    const totalWatchTime = analyticsAgg._sum.duration || 0;

    // User engagement metrics
    const userAnalyticsAgg = await prisma.userAnalytics.aggregate({
      _sum: {
        videosCreated: true,
        aiGenerations: true,
        exportsGenerated: true,
        collaborationTime: true,
      },
    });
    const videosCreated = userAnalyticsAgg._sum.videosCreated || 0;
    const aiGenerations = userAnalyticsAgg._sum.aiGenerations || 0;
    const exportsGenerated = userAnalyticsAgg._sum.exportsGenerated || 0;
    const collaborationTime = userAnalyticsAgg._sum.collaborationTime || 0;

    // Usage records (aggregate by action)
    const usageActions = ['video_created', 'ai_generation', 'export'];
    const usageAggs = await Promise.all(
      usageActions.map(action =>
        prisma.usageRecord.aggregate({
          where: { action },
          _sum: { quantity: true },
        })
      )
    );
    const usageMetrics = {
      videoCreated: usageAggs[0]._sum.quantity || 0,
      aiGeneration: usageAggs[1]._sum.quantity || 0,
      export: usageAggs[2]._sum.quantity || 0,
    };

    // Collaboration metrics
    const activeRooms = await prisma.collaborationRoom.count({ where: { isActive: true } });
    const totalRooms = await prisma.collaborationRoom.count();
    const totalMessages = await prisma.collaborationMessage.count();
    const totalEdits = await prisma.collaborationEdit.count();

    // AI usage metrics
    const aiAgg = await prisma.aIGeneration.aggregate({
      _count: { id: true },
      _sum: { tokensUsed: true, cost: true },
    });
    const aiGenerationsTotal = aiAgg._count.id || 0;
    const aiTokensUsed = aiAgg._sum.tokensUsed || 0;
    const aiCost = aiAgg._sum.cost || 0;

    // Metrics
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
      { label: 'Videos Created (UsageRecord)', value: usageMetrics.videoCreated },
      { label: 'AI Generations (UsageRecord)', value: usageMetrics.aiGeneration },
      { label: 'Exports (UsageRecord)', value: usageMetrics.export },
      { label: 'Active Collaboration Rooms', value: activeRooms },
      { label: 'Total Collaboration Rooms', value: totalRooms },
      { label: 'Collaboration Messages', value: totalMessages },
      { label: 'Collaboration Edits', value: totalEdits },
      { label: 'AI Generations (AIGeneration)', value: aiGenerationsTotal },
      { label: 'AI Tokens Used', value: aiTokensUsed },
      { label: 'AI Cost (USD)', value: `$${aiCost.toFixed(2)}` },
    ];

    // Insights (most viewed/shared video)
    const mostViewed = await prisma.videoAnalytics.findFirst({
      orderBy: { views: 'desc' },
      include: { video: true },
    });
    const mostShared = await prisma.videoAnalytics.findFirst({
      orderBy: { shares: 'desc' },
      include: { video: true },
    });

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
    return NextResponse.json({ error: error.message || 'Failed to fetch metrics' }, { status: 500 });
  }
}
