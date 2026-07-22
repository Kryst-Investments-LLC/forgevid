/**
 * Purchased credits — the second of ForgeVid's two credit pools.
 *
 * Pool 1 (lib/quota.ts) is the monthly plan allowance: it resets every
 * calendar month and is consumed first. Pool 2, here, is purchased credits
 * (SINGLE / TOPUP10 / TOPUP25 one-time Stripe payments): they never expire and
 * are only drawn on once the monthly allowance is exhausted.
 *
 * The ledger is append-only (CreditLedger) — a purchase is a +delta row, a
 * consumption is a -delta row, a refund is a compensating +delta row. The
 * balance is just SUM(delta), which also gives us a free audit trail instead
 * of a mutable counter that can drift from what actually happened.
 *
 * Reads used for entitlement decisions (getCreditBalance) fail CLOSED: an
 * unprovable balance is treated as zero, same as checkGenerationQuota fails
 * closed on lookup errors. Writes (grantCredits/consumeCredit/refund) are
 * best-effort bookkeeping — never fail a request over a ledger row, but log
 * loudly so gaps are visible.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';

export type CreditReason =
  | 'purchase_single'
  | 'purchase_topup10'
  | 'purchase_topup25'
  | 'consume_generation'
  | 'refund_failed_render';

/**
 * Current purchased-credit balance. Fails CLOSED: any lookup error returns 0
 * so a broken DB never silently unlocks a purchased-credit generation.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const result = await prisma.creditLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    return result._sum.delta ?? 0;
  } catch (error) {
    console.error('[Credits] Balance lookup failed, treating as 0:', error);
    return 0;
  }
}

export interface GrantCreditsArgs {
  userId: string;
  credits: number;
  reason: Extract<CreditReason, 'purchase_single' | 'purchase_topup10' | 'purchase_topup25'>;
  /** Stripe checkout session id — the idempotency key for this grant. */
  stripeSessionId: string;
}

/**
 * Grant purchased credits. Idempotent on stripeSessionId: Stripe redelivers
 * webhooks, and the unique constraint on CreditLedger.stripeSessionId means a
 * second delivery hits Prisma's P2002 duplicate-key error, which we treat as
 * "already granted" rather than an error.
 */
export async function grantCredits(args: GrantCreditsArgs): Promise<void> {
  try {
    await prisma.creditLedger.create({
      data: {
        userId: args.userId,
        delta: args.credits,
        reason: args.reason,
        stripeSessionId: args.stripeSessionId,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      // Already granted by a prior delivery of the same Stripe event — success.
      console.log(`[Credits] Grant for session ${args.stripeSessionId} already recorded, skipping`);
      return;
    }
    console.error('[Credits] Failed to grant credits:', error);
  }
}

/** Consume one purchased credit for a generation. Call ONLY after the job is accepted. */
export async function consumeCredit(args: { userId: string; videoId: string }): Promise<void> {
  try {
    await prisma.creditLedger.create({
      data: {
        userId: args.userId,
        delta: -1,
        reason: 'consume_generation',
        videoId: args.videoId,
      },
    });
  } catch (error) {
    console.error('[Credits] Failed to consume credit:', error);
  }
}

/**
 * Refund the purchased credit spent on a video whose render failed — mirrors
 * refundGenerationUsage() in lib/quota.ts for the monthly pool.
 *
 * Only refunds once: if this video never consumed a purchased credit (it used
 * the monthly allowance instead) there is nothing to refund, and if it was
 * already refunded, a second failure must not grant a free credit.
 */
export async function refundCreditForVideo(videoId: string): Promise<void> {
  try {
    const [consumed, refunded] = await Promise.all([
      prisma.creditLedger.findFirst({
        where: { videoId, reason: 'consume_generation' },
        select: { id: true, userId: true },
      }),
      prisma.creditLedger.findFirst({
        where: { videoId, reason: 'refund_failed_render' },
        select: { id: true },
      }),
    ]);

    if (!consumed || refunded) return;

    await prisma.creditLedger.create({
      data: {
        userId: consumed.userId,
        delta: 1,
        reason: 'refund_failed_render',
        videoId,
      },
    });
  } catch (error) {
    console.error('[Credits] Failed to refund credit:', error);
  }
}
