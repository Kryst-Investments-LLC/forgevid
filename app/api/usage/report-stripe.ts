import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/usage/report-stripe
 * Reports metered usage for all users to Stripe Metered Billing API.
 * This should be called on a schedule (e.g., daily or at billing period end).
 * Requires each user to have a Stripe customer ID and meter event name in their subscription metadata.
 */
export async function POST(req: NextRequest) {
  try {
    // Find all active subscriptions with Stripe customer ID and meter event name
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        metadata: { not: null },
      },
    });

    let reported = 0;
    for (const sub of subscriptions) {
      let metadata: any = {};
      try {
        metadata = sub.metadata ? JSON.parse(sub.metadata) : {};
      } catch {}
      const stripeCustomerId = metadata.stripeCustomerId;
      const meterEventName = metadata.meterEventName || 'ai_generation';
      if (!stripeCustomerId) continue;

      // Sum usage for this user since last report (or for current period)
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          userId: sub.userId,
          action: 'ai_generation',
          timestamp: {
            gte: sub.currentPeriodStart,
            lte: sub.currentPeriodEnd,
          },
        },
      });
        const totalQuantity = usageRecords.reduce((sum: number, rec: { quantity: number }) => sum + rec.quantity, 0);
      if (totalQuantity === 0) continue;

      // Report usage to Stripe Metered Billing API (Meter Events)
      await stripe.billing.meterEvents.create({
        event_name: meterEventName,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: String(totalQuantity),
        },
        timestamp: Math.floor(Date.now() / 1000),
      });
      reported++;
    }
    return NextResponse.json({ success: true, reported });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to report usage to Stripe' }, { status: 500 });
  }
}
