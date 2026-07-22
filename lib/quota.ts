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
 * Two credit pools: this monthly allowance is consumed FIRST. Once it's
 * exhausted, checkGenerationQuota falls back to the purchased-credit pool
 * (lib/credits.ts) — never-expiring credits bought via SINGLE/TOPUP10/TOPUP25.
 * A generation that runs on a purchased credit is flagged `usePurchasedCredit`
 * so the caller can consume the credit instead of (already-exhausted) quota,
 * and gets a `maxDurationSeconds` floor of 90s regardless of plan (see
 * lib/stripe.ts CREDIT_PACKS and the business design in TODO/PRD notes).
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';
import { getUserPlan, type Plan } from './plan';
import { getCreditBalance } from './credits';

export const GENERATION_ACTION = 'video_generation';

/** Videos rendered on a purchased credit get at least this long, regardless of plan cap. */
export const PURCHASED_CREDIT_MIN_DURATION_SECONDS = 90;

export interface PlanQuota {
  /** Generations per calendar month. */
  videosPerMonth: number;
  /** Longest allowed video, seconds. */
  maxDurationSeconds: number;
}

// Margins-protecting allowances (2026-07 credit-system relaunch). A purchased
// credit (SINGLE/TOPUP10/TOPUP25) can still buy a longer render than the plan
// cap — see PURCHASED_CREDIT_MIN_DURATION_SECONDS — but never unlocks 4K,
// avatars, voice cloning, or custom branding (those stay plan-gated in lib/plan.ts).
export const PLAN_QUOTAS: Record<Plan, PlanQuota> = {
  free: { videosPerMonth: 2, maxDurationSeconds: 60 },
  starter: { videosPerMonth: 30, maxDurationSeconds: 90 },
  pro: { videosPerMonth: 100, maxDurationSeconds: 120 },
  enterprise: { videosPerMonth: 250, maxDurationSeconds: 150 },
  custom: { videosPerMonth: 250, maxDurationSeconds: 150 },
};

export interface QuotaVerdict {
  allowed: boolean;
  plan: Plan;
  used: number;
  limit: number;
  maxDurationSeconds: number;
  reason?: string;
  upgradeRequired?: boolean;
  /** true when this generation must be paid for with a purchased credit, not monthly quota. */
  usePurchasedCredit?: boolean;
  /** Denial only: the user could unblock themselves with a Single/top-up purchase instead of upgrading. */
  topUpAvailable?: boolean;
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
    // Monthly allowance is spent — fall back to the purchased-credit pool
    // (never-expiring, bought via Single/top-up) before denying outright.
    const balance = await getCreditBalance(userId);
    if (balance > 0) {
      return {
        allowed: true,
        plan,
        used,
        limit: quota.videosPerMonth,
        maxDurationSeconds: Math.max(quota.maxDurationSeconds, PURCHASED_CREDIT_MIN_DURATION_SECONDS),
        usePurchasedCredit: true,
      };
    }

    return {
      allowed: false,
      plan,
      used,
      limit: quota.videosPerMonth,
      maxDurationSeconds: quota.maxDurationSeconds,
      reason:
        `Monthly limit reached (${used}/${quota.videosPerMonth} videos on the ${plan} plan). ` +
        `Buy a Single video or a top-up pack to keep going without upgrading.`,
      upgradeRequired: plan !== 'enterprise' && plan !== 'custom',
      topUpAvailable: true,
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

/**
 * Refund the quota slot for a video whose render failed.
 *
 * Usage is recorded up front (at enqueue) so a burst of requests can't blow past
 * the plan limit. But if the render then fails, that slot must be given back —
 * otherwise a failed render silently eats a paid-for credit. The videoId lives
 * inside the usage row's metadata JSON, so we match it there.
 */
export async function refundGenerationUsage(videoId: string): Promise<void> {
  try {
    await prisma.usageRecord.deleteMany({
      where: { action: GENERATION_ACTION, metadata: { contains: `"videoId":"${videoId}"` } },
    });
  } catch (error) {
    console.error('[Quota] Failed to refund usage:', error);
  }
}
