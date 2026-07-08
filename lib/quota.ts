/**
 * Usage quotas — the free tier must not be an open faucet.
 *
 * Every generation costs real money (GPT + TTS + Whisper + compute), so each
 * plan gets a monthly video budget and a max duration. Enforcement is
 * server-side against UsageRecord rows; the client only ever sees the verdict.
 *
 * This is also the upgrade pressure that makes the Stripe plans sell: the
 * rejection names the limit and flags `upgradeRequired`.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';
import { getUserPlan, type Plan } from './plan';

export const GENERATION_ACTION = 'video_generation';

export interface PlanQuota {
  /** Generations per calendar month. */
  videosPerMonth: number;
  /** Longest allowed video, seconds. */
  maxDurationSeconds: number;
}

export const PLAN_QUOTAS: Record<Plan, PlanQuota> = {
  free: { videosPerMonth: 3, maxDurationSeconds: 60 },
  starter: { videosPerMonth: 20, maxDurationSeconds: 180 },
  pro: { videosPerMonth: 100, maxDurationSeconds: 600 },
  enterprise: { videosPerMonth: 1000, maxDurationSeconds: 600 },
  custom: { videosPerMonth: 1000, maxDurationSeconds: 600 },
};

export interface QuotaVerdict {
  allowed: boolean;
  plan: Plan;
  used: number;
  limit: number;
  maxDurationSeconds: number;
  reason?: string;
  upgradeRequired?: boolean;
}

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * May this user start a generation of `durationSeconds`?
 * Fails CLOSED on lookup errors — an unprovable entitlement is a denial.
 */
export async function checkGenerationQuota(
  userId: string,
  durationSeconds: number,
): Promise<QuotaVerdict> {
  const plan = await getUserPlan(userId);
  const quota = PLAN_QUOTAS[plan];

  if (durationSeconds > quota.maxDurationSeconds) {
    return {
      allowed: false,
      plan,
      used: 0,
      limit: quota.videosPerMonth,
      maxDurationSeconds: quota.maxDurationSeconds,
      reason: `The ${plan} plan allows videos up to ${quota.maxDurationSeconds}s`,
      upgradeRequired: plan === 'free' || plan === 'starter',
    };
  }

  let used = 0;
  try {
    used = await prisma.usageRecord.count({
      where: {
        userId,
        action: GENERATION_ACTION,
        timestamp: { gte: monthStart() },
      },
    });
  } catch (error) {
    console.error('[Quota] Usage lookup failed, denying:', error);
    return {
      allowed: false,
      plan,
      used: 0,
      limit: quota.videosPerMonth,
      maxDurationSeconds: quota.maxDurationSeconds,
      reason: 'Could not verify your usage. Try again shortly.',
    };
  }

  if (used >= quota.videosPerMonth) {
    return {
      allowed: false,
      plan,
      used,
      limit: quota.videosPerMonth,
      maxDurationSeconds: quota.maxDurationSeconds,
      reason: `Monthly limit reached (${used}/${quota.videosPerMonth} videos on the ${plan} plan)`,
      upgradeRequired: plan !== 'enterprise' && plan !== 'custom',
    };
  }

  return {
    allowed: true,
    plan,
    used,
    limit: quota.videosPerMonth,
    maxDurationSeconds: quota.maxDurationSeconds,
  };
}

/** Record a consumed generation. Call ONLY after the job is accepted. */
export async function recordGenerationUsage(
  userId: string,
  videoId: string,
  durationSeconds: number,
): Promise<void> {
  try {
    await prisma.usageRecord.create({
      data: {
        userId,
        action: GENERATION_ACTION,
        resourceType: 'video',
        quantity: 1,
        metadata: JSON.stringify({ videoId, durationSeconds }),
      },
    });
  } catch (error) {
    // Never fail a paid-for generation over bookkeeping; log loudly instead.
    console.error('[Quota] Failed to record usage:', error);
  }
}
