/**
 * Server-side plan resolution.
 *
 * The client has `useSubscription()`, but a watermark enforced in the browser is
 * decorative. Rendering decisions must resolve the plan on the server.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise' | 'custom';

const PAID_PLANS: Plan[] = ['starter', 'pro', 'enterprise', 'custom'];

/** Subscription statuses that actually entitle a user to paid features. */
const ENTITLING_STATUSES = new Set(['ACTIVE', 'TRIALING']);

function normalizePlan(raw: string | null | undefined): Plan {
  const value = (raw ?? '').toLowerCase();
  return (PAID_PLANS as string[]).includes(value) ? (value as Plan) : 'free';
}

/**
 * The user's effective plan. Anything that is not an active/trialing paid
 * subscription is FREE — an expired or past_due subscription must not keep
 * unlocking paid output.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      select: { plan: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription || !ENTITLING_STATUSES.has(String(subscription.status))) {
      return 'free';
    }
    return normalizePlan(subscription.plan);
  } catch (error) {
    // Fail closed: if we cannot prove entitlement, treat the user as free.
    console.error('[Plan] Failed to resolve plan, defaulting to free:', error);
    return 'free';
  }
}

export function isPaidPlan(plan: Plan): boolean {
  return PAID_PLANS.includes(plan);
}

/** Free renders carry a watermark. Paid plans may remove it. */
export function requiresWatermark(plan: Plan): boolean {
  return !isPaidPlan(plan);
}

/** 4K rendering is a pro-tier feature (4x the pixels, ~4x the compute). */
export function allows4k(plan: Plan): boolean {
  return plan === 'pro' || plan === 'enterprise' || plan === 'custom';
}

/** Custom branding (logo overlay, intro/outro) is a paid feature. */
export function allowsCustomBranding(plan: Plan): boolean {
  return isPaidPlan(plan);
}

export const WATERMARK_TEXT = 'Made with ForgeVid';
