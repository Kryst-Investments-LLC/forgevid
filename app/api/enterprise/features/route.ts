import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac';

/**
 * REAL enterprise/ops overview — platform-wide counts + live process metrics.
 *
 * The previous version of this route returned hardcoded fake numbers (fixed
 * CPU/memory percentages, a fabricated 99.97% uptime, "compliant" status for
 * every framework). This one only reports what's actually true: real DB
 * counts (each wrapped so one missing/broken table can't 500 the whole
 * response), real Node process memory/uptime, and an honest, unaudited
 * compliance self-assessment.
 */

async function safeCount<T>(query: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await query();
  } catch (error) {
    console.error(`[enterprise/features] ${label} query failed:`, error);
    return null;
  }
}

function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

export async function GET() {
  try {
    // Platform-wide counts are admin-only (a regular user shouldn't see total
    // users / videos across the whole platform).
    const user = await getFreshSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [totalUsers, totalVideos, completedVideos, activeSubscriptions, totalGenerations] =
      await Promise.all([
        safeCount(() => prisma.user.count(), 'totalUsers'),
        safeCount(() => prisma.video.count(), 'totalVideos'),
        safeCount(() => prisma.video.count({ where: { status: 'COMPLETED' } }), 'completedVideos'),
        safeCount(() => prisma.subscription.count({ where: { status: 'ACTIVE' } }), 'activeSubscriptions'),
        safeCount(() => prisma.aIGeneration.count(), 'totalGenerations'),
      ]);

    const mem = process.memoryUsage();

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalVideos,
        completedVideos,
        activeSubscriptions,
        totalGenerations,
      },
      system: {
        memory: {
          heapUsedMB: bytesToMB(mem.heapUsed),
          heapTotalMB: bytesToMB(mem.heapTotal),
          rssMB: bytesToMB(mem.rss),
        },
        uptimeSeconds: Math.round(process.uptime()),
      },
      // Honest self-assessment, not a certification claim. Never report
      // "compliant"/"certified" or invented audit percentages here.
      compliance: {
        httpsEnforced: true,
        dataEncryptedInTransit: true,
        thirdPartyAudited: false,
        note: 'Self-assessed. Not yet independently audited (SOC 2 / HIPAA not certified).',
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[enterprise/features] failed:', error);
    return NextResponse.json({ error: 'Failed to load enterprise data' }, { status: 500 });
  }
}
